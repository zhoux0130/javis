import { useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Button } from "@tarojs/components";
import {
  DEFAULT_BASE_URL,
  connection,
  request,
  saveConnection,
  errorText,
} from "../../services/api";
import "./index.scss";
export default function Settings() {
  const old = connection();
  const [url, setUrl] = useState(old?.baseUrl || DEFAULT_BASE_URL),
    [token, setToken] = useState(old?.token || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function connect() {
    if (busy) return;
    const baseUrl = url.trim().replace(/\/+$/, "");
    if (
      !/^https:\/\/[^/?#]+(?::\d+)?$/.test(baseUrl) &&
      !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)
    ) {
      setError("请输入 HTTPS 服务地址，不带路径或访问凭证。");
      return;
    }
    if (!token.trim()) {
      setError("请填写连接凭证。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const config = { baseUrl, token: token.trim() };
      await request("/api/ping", "GET", undefined, config);
      saveConnection(config);
      Taro.navigateBack();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="settings">
      <Text className="settings-label">服务地址</Text>
      <Input
        className="settings-input"
        value={url}
        onInput={(e) => setUrl(e.detail.value)}
      />
      <Text className="settings-label">连接凭证</Text>
      <Input
        className="settings-input"
        password
        value={token}
        onInput={(e) => setToken(e.detail.value)}
      />
      {error && <Text className="settings-error">{error}</Text>}
      <Button className="settings-btn" disabled={busy} onClick={connect}>
        {busy ? "连接中…" : "连接"}
      </Button>
    </View>
  );
}
