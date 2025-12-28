import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram: any;
  }
}

type Task = {
  id: number;
  title: string;
  status: string;
};

type Pet = {
  mood: 'angry' | 'calm' | 'happy';
  points: number;
  level: number;
  streak: number;
};

const BACKEND_URL = 'https://namiplan-backend.onrender.com';

const PET_IMAGES: Record<'angry' | 'calm' | 'happy', string> = {
  angry: '/pet/angry.jpg',
  calm: '/pet/calm.jpg',
  happy: '/pet/happy.jpg'
};

const PET_ANIMATIONS: Record<string, string> = {
  'angry->calm': '/pet/angry_to_calm.mp4',
  'calm->angry': '/pet/calm_to_angry.mp4',
  'calm->happy': '/pet/calm_to_happy.mp4',
  'happy->calm': '/pet/happy_to_calm.mp4'
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [animation, setAnimation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<any[]>([]);

  const nextLevelPoints = pet ? pet.level * 5 : 0;
  const progress = pet
    ? Math.min(100, Math.floor((pet.points / nextLevelPoints) * 100))
    : 0;

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    console.log('TG initData:', tg.initData);

    fetch(`${BACKEND_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('AUTH ERROR:', data.error);
          return;
        }
        setUser(data.user);

        return Promise.all([
          fetch(`${BACKEND_URL}/tasks/${data.user.telegram_id}`).then(r => r.json()),
          fetch(`${BACKEND_URL}/pet/${data.user.telegram_id}`).then(r => r.json()),
          fetch(`${BACKEND_URL}/rewards/${data.user.telegram_id}`).then(r => r.json())
        ]);
      })
      .then(([tasksData, petData, rewardsData]) => {
        setTasks(tasksData);
        setPet(petData);
        setRewards(rewardsData);
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
      .then(updatedTask => {
        setTasks(prev =>
          prev.map(t => (t.id === updatedTask.id ? updatedTask : t))
        );

        return fetch(`${BACKEND_URL}/pet/${user.telegram_id}`);
      })
      .then(res => res.json())
      .then(newPet => {
        if (pet && pet.mood !== newPet.mood) {
          const key = `${pet.mood}->${newPet.mood}`;
          if (PET_ANIMATIONS[key]) {
            setAnimation(PET_ANIMATIONS[key]);
            setTimeout(() => setAnimation(null), 2500);
          }
        }

        setPet(newPet);

        // 🔥 ПЕРЕЗАГРУЖАЕМ НАГРАДЫ ПОСЛЕ ВЫПОЛНЕНИЯ ЗАДАЧИ
        fetch(`${BACKEND_URL}/rewards/${user.telegram_id}`)
          .then(r => r.json())
          .then(rewardsData => {
            setRewards(rewardsData);
          });
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
            <b>{task.title}</b> — {task.status}
            {task.status !== 'done' && (
              <div>
                <button onClick={() => markDone(task.id)}>
                  ✅ Выполнить
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {pet && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <h3>🐾 Питомец</h3>

          {animation ? (
            <video
              src={animation}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', borderRadius: 12 }}
            />
          ) : (
            <img
              src={PET_IMAGES[pet.mood]}
              style={{ width: '100%', borderRadius: 12 }}
            />
          )}

          <p>
            Настроение: <b>{pet.mood}</b>
          </p>
          <p>Очки: {pet.points}</p>
          <p>Уровень: <b>{pet.level}</b></p>
          <p>Streak: 🔥 {pet.streak} дней</p>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12 }}>
              До следующего уровня: {pet.points}/{nextLevelPoints}
            </div>
            <div
              style={{
                height: 6,
                background: '#eee',
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#4caf50'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
