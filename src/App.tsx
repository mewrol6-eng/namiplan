import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram: any;
  }
}

const BACKEND_URL = 'https://YOUR-BACKEND.onrender.com';

type Task = {
  id: number;
  title: string;
  status: string;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const initData = tg.initData;

    fetch(`${BACKEND_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        return fetch(`${BACKEND_URL}/tasks/${data.user.telegram_id}`);
      })
      .then(res => res.json())
      .then(ts => {
        setTasks(ts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function markDone(taskId: number) {
    fetch(`${BACKEND_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    })
      .then(res => res.json())
      .then(updated => {
        setTasks(prev =>
          prev.map(t => (t.id === updated.id ? updated : t))
        );
      });
  }

  if (loading) return <div style={{ padding: 20 }}>Загрузка...</div>;
  if (!user) return <div style={{ padding: 20 }}>Ошибка авторизации</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Привет, {user.first_name} 👋</h2>

      <h3>Мои задачи</h3>

      {tasks.length === 0 && <p>Задач пока нет</p>}

      <ul style={{ padding: 0 }}>
        {tasks.map(task => (
          <li
            key={task.id}
            style={{
              listStyle: 'none',
              marginBottom: 10,
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 8
            }}
          >
            <div>
              <b>{task.title}</b>
            </div>
            <div>Статус: {task.status}</div>

            {task.status !== 'done' && (
              <button
                onClick={() => markDone(task.id)}
                style={{ marginTop: 6 }}
              >
                ✅ Выполнить
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
