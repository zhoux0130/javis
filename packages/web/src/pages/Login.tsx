import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, App } from 'antd';
import { ApiError, api } from '../api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  async function submit({ token }: { token: string }) {
    setBusy(true);
    try {
      await api.login(token.trim());
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (e) {
      message.error(e instanceof ApiError && e.status === 401 ? '凭证不对' : '登录失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f2f1', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 360 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          javis 运营后台
        </Typography.Title>
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="token" label="访问凭证" rules={[{ required: true, message: '请填写访问凭证' }]}>
            <Input.Password autoFocus placeholder="JAVIS_AUTH_TOKEN" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
