#pragma once
#include <string>

#include "ptp_def.h"

class PtpClient {
 public:
  PtpClient();
  ~PtpClient();

  bool connect(std::wstring* modelOut, std::wstring* errorOut);
  void disconnect();
  bool isConnected() const { return connected_; }

  // Shoot and wait for JPEG into saveDir. Returns absolute path or empty.
  bool capture(const std::wstring& saveDir, DWORD timeoutMs,
               std::wstring* filePathOut, std::wstring* errorOut);

  // Poll properties (keeps remote session alive).
  bool pump();

 private:
  HRESULT escape(WORD op, DWORD* params, DWORD numParams, DWORD nextPhase,
                 const void* writeData, DWORD writeSize, BYTE** readOut,
                 DWORD* readSize, WORD* responseCode);
  bool prepareWia(std::wstring* modelOut, std::wstring* errorOut);
  bool sdioConnectSequence(std::wstring* errorOut);
  bool setHostSaveMedia(std::wstring* errorOut);
  bool controlDevice(DWORD prop, UINT16 value);
  bool setProp(DWORD prop, const void* value, DWORD size);
  bool getObjectInfo(DWORD handle, PTP_GetObjectInfo* info);
  bool getObject(DWORD handle, BYTE* buffer, DWORD size);
  bool pollAndSaveShot(const std::wstring& saveDir, DWORD timeoutMs,
                       std::wstring* filePathOut, std::wstring* errorOut);
  bool parseAndMaybeSave(PTP_VENDOR_DATA_OUT* data, const std::wstring& saveDir,
                         std::wstring* filePathOut);

  IUnknown* wiaRoot_ = nullptr;  // IWiaItem*
  void* itemExtra_ = nullptr;    // IWiaItemExtras*
  HANDLE mutex_ = nullptr;
  bool connected_ = false;
  bool comInit_ = false;
};
