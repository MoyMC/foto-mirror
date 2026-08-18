#include "ptp_client.h"

#include <Sti.h>
#include <Wia.h>
#include <atlbase.h>
#include <comdef.h>

#include <algorithm>
#include <memory>

namespace {

bool NameLooksLikeSony(const std::wstring& name) {
  std::wstring lower = name;
  for (auto& c : lower) c = static_cast<wchar_t>(towlower(c));
  return lower.find(L"ilce") != std::wstring::npos ||
         lower.find(L"sony") != std::wstring::npos ||
         lower.find(L"imaging edge") != std::wstring::npos;
}

}  // namespace

PtpClient::PtpClient() = default;

PtpClient::~PtpClient() { disconnect(); }

HRESULT PtpClient::escape(WORD op, DWORD* params, DWORD numParams,
                          DWORD nextPhase, const void* writeData,
                          DWORD writeSize, BYTE** readOut, DWORD* readSize,
                          WORD* responseCode) {
  if (!itemExtra_) return E_FAIL;
  IWiaItemExtras* extras = static_cast<IWiaItemExtras*>(itemExtra_);

  if (!mutex_) {
    mutex_ = CreateMutexW(nullptr, FALSE, L"FotoMirrorPtpMutex");
    if (!mutex_) return E_FAIL;
  }
  WaitForSingleObject(mutex_, INFINITE);

  HRESULT hr = E_FAIL;
  DWORD dwDataInSize = SIZEOF_REQUIRED_VENDOR_DATA_IN + writeSize;
  DWORD dwDataOutSize =
      SIZEOF_REQUIRED_VENDOR_DATA_OUT + (readSize ? *readSize : 0x1000);
  DWORD dwActual = 0;

  auto* pIn = static_cast<PTP_VENDOR_DATA_IN*>(CoTaskMemAlloc(dwDataInSize));
  auto* pOut = static_cast<PTP_VENDOR_DATA_OUT*>(CoTaskMemAlloc(dwDataOutSize));
  if (!pIn || !pOut) {
    if (pIn) CoTaskMemFree(pIn);
    if (pOut) CoTaskMemFree(pOut);
    ReleaseMutex(mutex_);
    return E_OUTOFMEMORY;
  }
  ZeroMemory(pIn, dwDataInSize);
  ZeroMemory(pOut, dwDataOutSize);

  pIn->OpCode = op;
  pIn->NextPhase = nextPhase;
  pIn->NumParams = numParams;
  for (DWORD i = 0; i < numParams && i < PTP_MAX_PARAMS; i++) {
    pIn->Params[i] = params[i];
  }
  if (writeData && writeSize) {
    memcpy_s(pIn->VendorWriteData, writeSize, writeData, writeSize);
  }

  hr = extras->Escape(ESCAPE_PTP_VENDOR_COMMAND, reinterpret_cast<BYTE*>(pIn),
                      dwDataInSize, reinterpret_cast<BYTE*>(pOut),
                      dwDataOutSize, &dwActual);

  if (SUCCEEDED(hr) && responseCode) {
    *responseCode = pOut->ResponseCode;
  }

  if (SUCCEEDED(hr) && readOut && readSize) {
    DWORD payload = 0;
    if (dwActual > SIZEOF_REQUIRED_VENDOR_DATA_OUT) {
      payload = dwActual - SIZEOF_REQUIRED_VENDOR_DATA_OUT;
    }
    *readOut = static_cast<BYTE*>(CoTaskMemAlloc(payload ? payload : 1));
    if (*readOut && payload) {
      memcpy_s(*readOut, payload, pOut->VendorReadData, payload);
      *readSize = payload;
    } else if (*readOut) {
      *readSize = 0;
    }
  }

  CoTaskMemFree(pIn);
  CoTaskMemFree(pOut);
  ReleaseMutex(mutex_);
  return hr;
}

bool PtpClient::prepareWia(std::wstring* modelOut, std::wstring* errorOut) {
  HRESULT hr = S_OK;
  if (!comInit_) {
    hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
      if (errorOut) *errorOut = L"CoInitializeEx failed";
      return false;
    }
    comInit_ = true;
  }

  CComPtr<IWiaDevMgr> mgr;
  hr = mgr.CoCreateInstance(CLSID_WiaDevMgr);
  if (FAILED(hr)) {
    if (errorOut) *errorOut = L"WiaDevMgr unavailable";
    return false;
  }

  CComPtr<IEnumWIA_DEV_INFO> enumerator;
  hr = mgr->EnumDeviceInfo(WIA_DEVINFO_ENUM_LOCAL, &enumerator);
  if (FAILED(hr) || !enumerator) {
    if (errorOut) *errorOut = L"EnumDeviceInfo failed";
    return false;
  }

  BSTR chosenId = nullptr;
  std::wstring chosenName;

  while (true) {
    CComPtr<IWiaPropertyStorage> storage;
    ULONG fetched = 0;
    hr = enumerator->Next(1, &storage, &fetched);
    if (hr != S_OK || fetched == 0) break;

    PROPSPEC specs[2] = {};
    specs[0].ulKind = PRSPEC_PROPID;
    specs[0].propid = WIA_DIP_DEV_ID;
    specs[1].ulKind = PRSPEC_PROPID;
    specs[1].propid = WIA_DIP_DEV_NAME;
    PROPVARIANT values[2];
    PropVariantInit(&values[0]);
    PropVariantInit(&values[1]);
    if (SUCCEEDED(storage->ReadMultiple(2, specs, values))) {
      std::wstring id = values[0].bstrVal ? values[0].bstrVal : L"";
      std::wstring name = values[1].bstrVal ? values[1].bstrVal : L"";
      if (NameLooksLikeSony(name) || NameLooksLikeSony(id)) {
        chosenId = SysAllocString(id.c_str());
        chosenName = name.empty() ? id : name;
        PropVariantClear(&values[0]);
        PropVariantClear(&values[1]);
        break;
      }
    }
    PropVariantClear(&values[0]);
    PropVariantClear(&values[1]);
  }

  CComPtr<IWiaItem> root;
  if (chosenId) {
    hr = mgr->CreateDevice(chosenId, &root);
    SysFreeString(chosenId);
  } else {
    // Fallback: dialog / auto-select if only one camera.
    BSTR id = nullptr;
    hr = mgr->SelectDeviceDlg(nullptr, StiDeviceTypeDigitalCamera, 0, &id,
                              &root);
    if (id) {
      chosenName = id;
      SysFreeString(id);
    }
  }

  if (FAILED(hr) || !root) {
    if (errorOut) {
      *errorOut =
          L"No Sony WIA camera found. Close Imaging Edge and use PC Remote.";
    }
    return false;
  }

  IWiaItemExtras* extras = nullptr;
  hr = root->QueryInterface(IID_IWiaItemExtras,
                            reinterpret_cast<void**>(&extras));
  if (FAILED(hr) || !extras) {
    if (errorOut) *errorOut = L"IWiaItemExtras unavailable";
    return false;
  }

  wiaRoot_ = root.Detach();
  itemExtra_ = extras;
  if (modelOut) *modelOut = chosenName.empty() ? L"Sony" : chosenName;
  return true;
}

bool PtpClient::controlDevice(DWORD prop, UINT16 value) {
  DWORD params[1] = {prop};
  WORD resp = 0;
  HRESULT hr =
      escape(PTP_OC_SDIOControlDevice, params, 1, PTP_NEXTPHASE_WRITE_DATA,
             &value, sizeof(value), nullptr, nullptr, &resp);
  return SUCCEEDED(hr) && (resp == 0 || resp == PTP_RC_OK);
}

bool PtpClient::setProp(DWORD prop, const void* value, DWORD size) {
  DWORD params[1] = {prop};
  WORD resp = 0;
  HRESULT hr =
      escape(PTP_OC_SDIOSetExtDevicePropValue, params, 1,
             PTP_NEXTPHASE_WRITE_DATA, value, size, nullptr, nullptr, &resp);
  return SUCCEEDED(hr);
}

bool PtpClient::sdioConnectSequence(std::wstring* errorOut) {
  DWORD params[3] = {1, SDIO_CONNECT_ID, SDIO_CONNECT_ID};
  HRESULT hr =
      escape(PTP_OC_SDIOConnect, params, 3, PTP_NEXTPHASE_READ_DATA, nullptr, 0,
             nullptr, nullptr, nullptr);
  if (FAILED(hr)) {
    if (errorOut) *errorOut = L"SDIOConnect(1) failed";
    return false;
  }

  params[0] = 2;
  hr = escape(PTP_OC_SDIOConnect, params, 3, PTP_NEXTPHASE_READ_DATA, nullptr, 0,
              nullptr, nullptr, nullptr);
  if (FAILED(hr)) {
    if (errorOut) *errorOut = L"SDIOConnect(2) failed";
    return false;
  }

  DWORD verParams[1] = {SDI_Extension_Version};
  DWORD readSize = 0x1000;
  BYTE* readBuf = nullptr;
  hr = escape(PTP_OC_SDIOGetExtDeviceInfo, verParams, 1, PTP_NEXTPHASE_READ_DATA,
              nullptr, 0, &readBuf, &readSize, nullptr);
  if (readBuf) CoTaskMemFree(readBuf);
  if (FAILED(hr)) {
    if (errorOut) *errorOut = L"SDIOGetExtDeviceInfo failed";
    return false;
  }

  params[0] = 3;
  hr = escape(PTP_OC_SDIOConnect, params, 3, PTP_NEXTPHASE_READ_DATA, nullptr, 0,
              nullptr, nullptr, nullptr);
  if (FAILED(hr)) {
    if (errorOut) *errorOut = L"SDIOConnect(3) failed";
    return false;
  }
  Sleep(200);
  return true;
}

bool PtpClient::setHostSaveMedia(std::wstring* errorOut) {
  UINT8 hostPc = 0x01;
  if (!setProp(DPC_POSITION_KEY, &hostPc, sizeof(hostPc))) {
    // Non-fatal on some firmwares.
  }
  Sleep(200);

  UINT32 stillMode = 0x00000001;
  setProp(DPC_DRIVE_MODE, &stillMode, sizeof(stillMode));
  Sleep(200);

  UINT16 hostMedia = 0x0001;  // Host Device
  if (!setProp(DPC_SAVE_MEDIA, &hostMedia, sizeof(hostMedia))) {
    if (errorOut) *errorOut = L"Could not set Save Media = Host Device";
    // Continue anyway — camera menu may already be PC-only.
  }
  Sleep(200);
  return true;
}

bool PtpClient::connect(std::wstring* modelOut, std::wstring* errorOut) {
  if (connected_) {
    if (modelOut) *modelOut = L"already-connected";
    return true;
  }
  disconnect();
  if (!prepareWia(modelOut, errorOut)) return false;
  if (!sdioConnectSequence(errorOut)) {
    disconnect();
    return false;
  }
  setHostSaveMedia(errorOut);
  connected_ = true;
  return true;
}

void PtpClient::disconnect() {
  connected_ = false;
  if (itemExtra_) {
    static_cast<IWiaItemExtras*>(itemExtra_)->Release();
    itemExtra_ = nullptr;
  }
  if (wiaRoot_) {
    static_cast<IWiaItem*>(wiaRoot_)->Release();
    wiaRoot_ = nullptr;
  }
  if (mutex_) {
    CloseHandle(mutex_);
    mutex_ = nullptr;
  }
}

bool PtpClient::getObjectInfo(DWORD handle, PTP_GetObjectInfo* info) {
  DWORD params[1] = {handle};
  DWORD readSize = sizeof(PTP_GetObjectInfo) + 0x1000;
  BYTE* readBuf = nullptr;
  WORD resp = 0;
  HRESULT hr =
      escape(PTP_OC_GetObjectInfo, params, 1, PTP_NEXTPHASE_READ_DATA, nullptr,
             0, &readBuf, &readSize, &resp);
  if (FAILED(hr) || !readBuf) {
    if (readBuf) CoTaskMemFree(readBuf);
    return false;
  }
  ZeroMemory(info, sizeof(*info));
  memcpy_s(info, sizeof(*info), readBuf,
           (std::min)(readSize, static_cast<DWORD>(sizeof(*info))));
  CoTaskMemFree(readBuf);
  return true;
}

bool PtpClient::getObject(DWORD handle, BYTE* buffer, DWORD size) {
  DWORD params[1] = {handle};
  DWORD readSize = size;
  BYTE* readBuf = nullptr;
  WORD resp = 0;
  HRESULT hr = escape(PTP_OC_GetObject, params, 1, PTP_NEXTPHASE_READ_DATA,
                      nullptr, 0, &readBuf, &readSize, &resp);
  if (FAILED(hr) || !readBuf || readSize < size) {
    if (readBuf) CoTaskMemFree(readBuf);
    return false;
  }
  if (resp != 0 && resp != PTP_RC_OK) {
    CoTaskMemFree(readBuf);
    return false;
  }
  memcpy_s(buffer, size, readBuf, size);
  CoTaskMemFree(readBuf);
  return true;
}

bool PtpClient::parseAndMaybeSave(PTP_VENDOR_DATA_OUT* holder,
                                  const std::wstring& saveDir,
                                  std::wstring* filePathOut) {
  if (!holder) return false;
  unsigned long long length =
      *reinterpret_cast<unsigned long long*>(&holder->VendorReadData[0]);
  unsigned int offset = sizeof(length);

  for (unsigned long long i = 0; i < length; i++) {
    unsigned short propertyCode = *reinterpret_cast<unsigned short*>(
        &holder->VendorReadData[offset]);
    offset += sizeof(unsigned short);
    unsigned short dataType = *reinterpret_cast<unsigned short*>(
        &holder->VendorReadData[offset]);
    offset += sizeof(unsigned short);
    offset += sizeof(unsigned char);  // get/set
    offset += sizeof(unsigned char);  // enabled

    unsigned long sizeofType = 0;
    unsigned long long defaultValue = 0;
    unsigned long long currentValue = 0;

    switch (dataType) {
      case PTP_DT_INT8:
      case PTP_DT_UINT8:
        sizeofType = 1;
        defaultValue = holder->VendorReadData[offset];
        offset += 1;
        currentValue = holder->VendorReadData[offset];
        offset += 1;
        break;
      case PTP_DT_INT16:
      case PTP_DT_UINT16:
        sizeofType = 2;
        defaultValue = *reinterpret_cast<unsigned short*>(
            &holder->VendorReadData[offset]);
        offset += 2;
        currentValue = *reinterpret_cast<unsigned short*>(
            &holder->VendorReadData[offset]);
        offset += 2;
        break;
      case PTP_DT_INT32:
      case PTP_DT_UINT32:
        sizeofType = 4;
        defaultValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        currentValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        break;
      case PTP_DT_INT64:
      case PTP_DT_UINT64:
        sizeofType = 8;
        defaultValue = *reinterpret_cast<unsigned long long*>(
            &holder->VendorReadData[offset]);
        offset += 8;
        currentValue = *reinterpret_cast<unsigned long long*>(
            &holder->VendorReadData[offset]);
        offset += 8;
        break;
      case PTP_DT_STR: {
        sizeofType = 0;
        offset += 1;
        auto* ws = reinterpret_cast<wchar_t*>(&holder->VendorReadData[offset]);
        offset += static_cast<unsigned int>(sizeof(wchar_t) * (wcslen(ws) + 1));
        offset += 1;
        ws = reinterpret_cast<wchar_t*>(&holder->VendorReadData[offset]);
        offset += static_cast<unsigned int>(sizeof(wchar_t) * (wcslen(ws) + 1));
        break;
      }
      case PTP_DT_AINT8:
      case PTP_DT_AUINT8:
        sizeofType = 0;
        defaultValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(1 * defaultValue);
        currentValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(1 * currentValue);
        break;
      case PTP_DT_AINT16:
      case PTP_DT_AUINT16:
        sizeofType = 0;
        defaultValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(2 * defaultValue);
        currentValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(2 * currentValue);
        break;
      case PTP_DT_AINT32:
      case PTP_DT_AUINT32:
        sizeofType = 0;
        defaultValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(4 * defaultValue);
        currentValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(4 * currentValue);
        break;
      case PTP_DT_AINT64:
      case PTP_DT_AUINT64:
        sizeofType = 0;
        defaultValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(8 * defaultValue);
        currentValue = *reinterpret_cast<unsigned long*>(
            &holder->VendorReadData[offset]);
        offset += 4;
        offset += static_cast<unsigned int>(8 * currentValue);
        break;
      default:
        sizeofType = 0;
        break;
    }

    unsigned char formFlag = holder->VendorReadData[offset];
    offset += 1;

    if (formFlag == 0x01) {
      if (propertyCode == DPC_SHOOTING_FILE_INFOMATION &&
          (currentValue & 0x8000) == 0x8000) {
        PTP_GetObjectInfo info = {};
        if (!getObjectInfo(SHOT_OBJECT_HANDLE, &info) || info.ObjCompSz == 0) {
          return false;
        }
        std::unique_ptr<BYTE[]> buffer(new BYTE[info.ObjCompSz]);
        if (!getObject(SHOT_OBJECT_HANDLE, buffer.get(), info.ObjCompSz)) {
          return false;
        }

        std::wstring fileName = reinterpret_cast<wchar_t*>(info.FileName);
        if (fileName.empty()) fileName = L"shot.jpg";
        std::wstring full = saveDir;
        if (!full.empty() && full.back() != L'\\' && full.back() != L'/') {
          full += L'\\';
        }
        full += fileName;

        HANDLE hFile =
            CreateFileW(full.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS,
                        FILE_ATTRIBUTE_NORMAL, nullptr);
        if (hFile == INVALID_HANDLE_VALUE) return false;
        DWORD written = 0;
        BOOL ok =
            WriteFile(hFile, buffer.get(), info.ObjCompSz, &written, nullptr);
        CloseHandle(hFile);
        if (!ok || written != info.ObjCompSz) return false;
        if (filePathOut) *filePathOut = full;
        return true;
      }
      offset += static_cast<unsigned int>(sizeofType * 3);
    } else if (formFlag == 0) {
      // empty
    } else {
      unsigned short num = *reinterpret_cast<unsigned short*>(
          &holder->VendorReadData[offset]);
      offset += sizeof(unsigned short);
      offset += static_cast<unsigned int>(num * sizeofType);
    }
  }
  return false;
}

bool PtpClient::pump() {
  if (!connected_) return false;
  DWORD readSize = 64 * 1024;
  BYTE* readBuf = nullptr;
  HRESULT hr =
      escape(PTP_OC_SDIOGetAllExtDeviceInfo, nullptr, 0, PTP_NEXTPHASE_READ_DATA,
             nullptr, 0, &readBuf, &readSize, nullptr);
  if (readBuf) CoTaskMemFree(readBuf);
  return SUCCEEDED(hr);
}

bool PtpClient::pollAndSaveShot(const std::wstring& saveDir, DWORD timeoutMs,
                                std::wstring* filePathOut,
                                std::wstring* errorOut) {
  DWORD start = GetTickCount();
  while (GetTickCount() - start < timeoutMs) {
    DWORD readSize = 64 * 1024;
    BYTE* readBuf = nullptr;
    HRESULT hr = escape(PTP_OC_SDIOGetAllExtDeviceInfo, nullptr, 0,
                        PTP_NEXTPHASE_READ_DATA, nullptr, 0, &readBuf, &readSize,
                        nullptr);
    if (SUCCEEDED(hr) && readBuf) {
      // Reconstruct a fake OUT header + payload for the parser.
      DWORD total = SIZEOF_REQUIRED_VENDOR_DATA_OUT + readSize;
      auto* holder =
          static_cast<PTP_VENDOR_DATA_OUT*>(CoTaskMemAlloc(total));
      if (holder) {
        ZeroMemory(holder, total);
        memcpy_s(holder->VendorReadData, readSize, readBuf, readSize);
        bool saved = parseAndMaybeSave(holder, saveDir, filePathOut);
        CoTaskMemFree(holder);
        CoTaskMemFree(readBuf);
        if (saved) return true;
      } else {
        CoTaskMemFree(readBuf);
      }
    } else if (readBuf) {
      CoTaskMemFree(readBuf);
    }
    Sleep(150);
  }
  if (errorOut) *errorOut = L"Timeout waiting for JPEG from camera";
  return false;
}

bool PtpClient::capture(const std::wstring& saveDir, DWORD timeoutMs,
                        std::wstring* filePathOut, std::wstring* errorOut) {
  if (!connected_) {
    if (errorOut) *errorOut = L"Not connected";
    return false;
  }
  CreateDirectoryW(saveDir.c_str(), nullptr);

  // Half-press then full shutter (helps AF on some bodies).
  controlDevice(DPC_S1_BUTTON, BTN_DOWN);
  Sleep(120);
  controlDevice(DPC_S2_BUTTON, BTN_DOWN);
  Sleep(200);
  controlDevice(DPC_S2_BUTTON, BTN_UP);
  Sleep(50);
  controlDevice(DPC_S1_BUTTON, BTN_UP);

  return pollAndSaveShot(saveDir, timeoutMs, filePathOut, errorOut);
}
