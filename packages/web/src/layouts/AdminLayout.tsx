import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Layout, Menu, theme } from 'antd';
import { DashboardOutlined, LogoutOutlined } from '@ant-design/icons';
import { api } from '../api';

// 新增运营页面：在这里加菜单项，并在 App.tsx 的后台路由下加 <Route>。
const MENU = [{ key: '/', icon: <DashboardOutlined />, label: '概览' }];

export function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { token } = theme.useToken();
  async function logout() {
    await api.logout().catch(() => undefined);
    navigate('/login', { replace: true });
  }
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider breakpoint="lg" collapsedWidth={0} theme="light" style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', fontWeight: 600, fontSize: 16 }}>
          javis 运营后台
        </div>
        <Menu mode="inline" selectedKeys={[pathname]} items={MENU} onClick={({ key }) => navigate(key)} style={{ borderInlineEnd: 0 }} />
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            background: token.colorBgContainer,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
            退出
          </Button>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
