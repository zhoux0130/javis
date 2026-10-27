import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Row, Statistic, Tag } from 'antd';
import { api, type Health } from '../api';

const DB_TAG: Record<Health['db'], { color: string; text: string }> = {
  ok: { color: 'green', text: '正常' },
  down: { color: 'red', text: '不可用' },
  unconfigured: { color: 'default', text: '未配置' },
};

export function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.health().then(setHealth, (e) => setError(String(e)));
  }, []);
  return (
    <Row gutter={[16, 16]}>
      {error && (
        <Col span={24}>
          <Alert type="error" message="服务状态获取失败" description={error} showIcon />
        </Col>
      )}
      <Col xs={24} md={8}>
        <Card loading={!health && !error}>
          <Statistic title="服务" value={health?.ok ? '运行中' : '异常'} />
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card title="系统状态" loading={!health && !error}>
          {health && (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="数据库">
                <Tag color={DB_TAG[health.db].color}>{DB_TAG[health.db].text}</Tag>
                {health.database}
              </Descriptions.Item>
              <Descriptions.Item label="服务器时间">{new Date(health.time).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </Col>
    </Row>
  );
}
