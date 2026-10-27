import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { View, Text, Button } from "@tarojs/components";
import { connection, request, errorText } from "../../services/api";
import "./index.scss";
export default function Index() {
  const [status, setStatus] = useState("检查中…");
  useDidShow(() => {
    const c = connection();
    if (!c) {
      setStatus("未连接");
      return;
    }
    request<{ pong: boolean }>("/api/ping")
      .then(() => setStatus(`已连接 ${c.baseUrl}`))
      .catch((e) => setStatus(errorText(e)));
  });
  return (
    <View className="home">
      <Text className="home-title">javis</Text>
      <Text className="home-status">{status}</Text>
      <Button
        className="home-btn"
        onClick={() => Taro.navigateTo({ url: "/pages/settings/index" })}
      >
        连接设置
      </Button>
    </View>
  );
}
