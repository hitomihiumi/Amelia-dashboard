import type { Dict } from "../types";
import type { adminLogs as en } from "../en/adminLogs";

export const adminLogs: Dict<typeof en> = {
  title: "Логи",
  description: "Попередження та помилки всіх контейнерів за останні 24 години.",
  level: { error: "Помилки", warn: "Попередження" },
  summary: {
    errors: "{count, plural, one {# помилка} few {# помилки} many {# помилок} other {# помилки}}",
    warnings:
      "{count, plural, one {# попередження} few {# попередження} many {# попереджень} other {# попередження}}",
    window: "за останні {hours} год",
  },
  filters: {
    level: "Важливість",
    all: "Усі",
    period: "Період",
    hours: "{hours} год",
    allContainers: "Усі контейнери",
    search: "Пошук у повідомленнях (Enter)",
  },
  live: { on: "Автооновлення: увімк", off: "Автооновлення: вимк" },
  refresh: "Оновити",
  empty: {
    title: "Попереджень і помилок немає",
    text: "За цими фільтрами за період нічого немає. Або все добре, або не запущено збирач логів.",
  },
  unavailable: {
    title: "Логи недоступні",
    text: "Не вдалося прочитати Redis. Перевірте REDIS_URL і що сервіс logs запущено.",
  },
  truncated: "Показано останні {shown} із {total} записів. Звузьте фільтри, щоб побачити решту.",
};
