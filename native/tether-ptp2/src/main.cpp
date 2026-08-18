#include <atomic>
#include <iostream>
#include <string>
#include <thread>

#include "ptp_client.h"

namespace {

std::atomic<bool> g_runPump{false};
std::atomic<bool> g_pumpThreadStop{false};
PtpClient* g_client = nullptr;

std::string Narrow(const std::wstring& ws) {
  if (ws.empty()) return {};
  int n = WideCharToMultiByte(CP_UTF8, 0, ws.c_str(), -1, nullptr, 0, nullptr,
                              nullptr);
  std::string s(n > 0 ? n - 1 : 0, '\0');
  if (n > 1) {
    WideCharToMultiByte(CP_UTF8, 0, ws.c_str(), -1, s.data(), n, nullptr,
                        nullptr);
  }
  return s;
}

std::wstring Widen(const std::string& s) {
  if (s.empty()) return {};
  int n = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, nullptr, 0);
  std::wstring ws(n > 0 ? n - 1 : 0, L'\0');
  if (n > 1) {
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, ws.data(), n);
  }
  return ws;
}

std::string EscapeJson(const std::string& s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (char c : s) {
    if (c == '\\' || c == '"') {
      out.push_back('\\');
      out.push_back(c);
    } else if (c == '\n') {
      out += "\\n";
    } else {
      out.push_back(c);
    }
  }
  return out;
}

void EmitOk(const char* cmd, const std::string& extraJson = {}) {
  std::cout << "{\"ok\":true,\"cmd\":\"" << cmd << "\"";
  if (!extraJson.empty()) std::cout << "," << extraJson;
  std::cout << "}" << std::endl;
}

void EmitErr(const char* cmd, const std::wstring& err) {
  std::cout << "{\"ok\":false,\"cmd\":\"" << cmd << "\",\"error\":\""
            << EscapeJson(Narrow(err)) << "\"}" << std::endl;
}

void PumpLoop() {
  while (!g_pumpThreadStop.load()) {
    if (g_runPump.load() && g_client && g_client->isConnected()) {
      g_client->pump();
    }
    Sleep(500);
  }
}

void HandleLine(PtpClient& client, const std::string& line) {
  if (line.empty()) return;

  if (line == "ping") {
    EmitOk("ping", client.isConnected() ? "\"connected\":true"
                                        : "\"connected\":false");
    return;
  }

  if (line == "status") {
    EmitOk("status",
           std::string("\"connected\":") +
               (client.isConnected() ? "true" : "false") +
               ",\"canShoot\":" + (client.isConnected() ? "true" : "false"));
    return;
  }

  if (line == "connect") {
    std::wstring model;
    std::wstring err;
    if (!client.connect(&model, &err)) {
      EmitErr("connect", err.empty() ? L"connect failed" : err);
      return;
    }
    g_runPump = true;
    EmitOk("connect",
           std::string("\"model\":\"") + EscapeJson(Narrow(model)) +
               "\",\"canShoot\":true");
    return;
  }

  if (line == "disconnect") {
    g_runPump = false;
    client.disconnect();
    EmitOk("disconnect");
    return;
  }

  if (line.rfind("capture ", 0) == 0) {
    if (!client.isConnected()) {
      EmitErr("capture", L"Not connected");
      return;
    }
    std::wstring dir = Widen(line.substr(8));
    // trim
    while (!dir.empty() && (dir.back() == L'\r' || dir.back() == L' ')) {
      dir.pop_back();
    }
    std::wstring path;
    std::wstring err;
    g_runPump = false;  // avoid concurrent Escape during capture
    bool ok = client.capture(dir, 8000, &path, &err);
    g_runPump = client.isConnected();
    if (!ok) {
      EmitErr("capture", err.empty() ? L"capture failed" : err);
      return;
    }
    EmitOk("capture", std::string("\"filePath\":\"") +
                          EscapeJson(Narrow(path)) + "\"");
    return;
  }

  if (line == "quit" || line == "exit") {
    g_runPump = false;
    client.disconnect();
    EmitOk("quit");
    g_pumpThreadStop = true;
    return;
  }

  EmitErr("unknown", Widen("Unknown command: " + line));
}

}  // namespace

int wmain() {
  SetConsoleOutputCP(CP_UTF8);
  SetConsoleCP(CP_UTF8);

  PtpClient client;
  g_client = &client;
  std::thread pump(PumpLoop);

  EmitOk("ready");

  std::string line;
  while (!g_pumpThreadStop.load() && std::getline(std::cin, line)) {
    if (!line.empty() && line.back() == '\r') line.pop_back();
    HandleLine(client, line);
    if (line == "quit" || line == "exit") break;
  }

  g_pumpThreadStop = true;
  g_runPump = false;
  if (pump.joinable()) pump.join();
  client.disconnect();
  return 0;
}
