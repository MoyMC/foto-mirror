#pragma once
#include <windows.h>

#define PTP_DT_UNDEF 0x0000
#define PTP_DT_INT8 0x0001
#define PTP_DT_UINT8 0x0002
#define PTP_DT_INT16 0x0003
#define PTP_DT_UINT16 0x0004
#define PTP_DT_INT32 0x0005
#define PTP_DT_UINT32 0x0006
#define PTP_DT_INT64 0x0007
#define PTP_DT_UINT64 0x0008
#define PTP_DT_AINT8 0x4001
#define PTP_DT_AUINT8 0x4002
#define PTP_DT_AINT16 0x4003
#define PTP_DT_AUINT16 0x4004
#define PTP_DT_AINT32 0x4005
#define PTP_DT_AUINT32 0x4006
#define PTP_DT_AINT64 0x4007
#define PTP_DT_AUINT64 0x4008
#define PTP_DT_STR 0xFFFF

#define PTP_RC_OK 0x2001

const DWORD SDI_Extension_Version = 0xC8;
const DWORD SHOT_OBJECT_HANDLE = 0xFFFFC001;
const DWORD ESCAPE_PTP_VENDOR_COMMAND = 0x0100;
const DWORD PTP_MAX_PARAMS = 5;
const DWORD SDIO_CONNECT_ID = 0x00000000;

const UINT16 BTN_UP = 0x0001;
const UINT16 BTN_DOWN = 0x0002;

#pragma pack(push, Old, 1)
typedef struct _PTP_VENDOR_DATA_IN {
  WORD OpCode;
  DWORD SessionId;
  DWORD TransactionId;
  DWORD Params[PTP_MAX_PARAMS];
  DWORD NumParams;
  DWORD NextPhase;
  BYTE VendorWriteData[1];
} PTP_VENDOR_DATA_IN, *PPTP_VENDOR_DATA_IN;

typedef struct _PTP_VENDOR_DATA_OUT {
  WORD ResponseCode;
  DWORD SessionId;
  DWORD TransactionId;
  DWORD Params[PTP_MAX_PARAMS];
  BYTE VendorReadData[1];
} PTP_VENDOR_DATA_OUT, *PPTP_VENDOR_DATA_OUT;
#pragma pack(pop, Old)

const DWORD SIZEOF_REQUIRED_VENDOR_DATA_IN = sizeof(PTP_VENDOR_DATA_IN) - 1;
const DWORD SIZEOF_REQUIRED_VENDOR_DATA_OUT = sizeof(PTP_VENDOR_DATA_OUT) - 1;
const DWORD PTP_NEXTPHASE_READ_DATA = 3;
const DWORD PTP_NEXTPHASE_WRITE_DATA = 4;

#pragma pack(push, 1)
typedef struct _PTP_GetObjectInfo {
  DWORD StorageID;
  WORD ObjFormat;
  WORD Protect;
  DWORD ObjCompSz;
  WORD ThumFormat;
  DWORD ThumCompSz;
  BYTE ThumPixW[4];
  BYTE ThumPixH[4];
  BYTE ImgPixW[4];
  BYTE ImgPixH[4];
  BYTE ImgBitDep[4];
  BYTE ParObj[4];
  WORD AssType;
  DWORD AssDesc;
  DWORD SeqNum;
  BYTE FileNemeLen;
  BYTE FileName[27];
  BYTE CaptDate[32];
  BYTE ModDate;
  BYTE Keywords;
  BYTE dummy[32];
} PTP_GetObjectInfo, *PPTP_GetObjectInfo;
#pragma pack(pop)

enum {
  PTP_OC_GetDeviceInfo = 0x1001,
  PTP_OC_GetObjectInfo = 0x1008,
  PTP_OC_GetObject = 0x1009,
  PTP_OC_SDIOConnect = 0x9201,
  PTP_OC_SDIOGetExtDeviceInfo = 0x9202,
  PTP_OC_SDIOSetExtDevicePropValue = 0x9205,
  PTP_OC_SDIOControlDevice = 0x9207,
  PTP_OC_SDIOGetAllExtDeviceInfo = 0x9209,
};

enum {
  DPC_S2_BUTTON = 0xD2C2,
  DPC_S1_BUTTON = 0xD2C1,
  DPC_SHOOTING_FILE_INFOMATION = 0xD215,
  DPC_SAVE_MEDIA = 0xD222,
  DPC_POSITION_KEY = 0xD25A,
  DPC_DRIVE_MODE = 0x5013,
};
