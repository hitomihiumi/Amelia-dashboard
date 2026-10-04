import type { Dict } from "../types";
import type { adminLogs as en } from "../en/adminLogs";

export const adminLogs: Dict<typeof en> = {
  title: "Логи",
  description: "Предупреждения и ошибки всех контейнеров за последние 24 часа.",
  level: { error: "Ошибки", warn: "Предупреждения" },
  summary: {
    errors: "{count, plural, one {# ошибка} few {# ошибки} many {# ошибок} other {# ошибки}}",
    warnings:
      "{count, plural, one {# предупреждение} few {# предупреждения} many {# предупреждений} other {# предупреждения}}",
    window: "за последние {hours} ч",
  },
  filters: {
    level: "Важность",
    all: "Все",
    period: "Период",
    hours: "{hours} ч",
    allContainers: "Все контейнеры",
    search: "Поиск по сообщениям (Enter)",
  },
  live: { on: "Автообновление: вкл", off: "Автообновление: выкл" },
  refresh: "Обновить",
  empty: {
    title: "Предупреждений и ошибок нет",
    text: "По этим фильтрам за период ничего нет. Либо всё хорошо, либо не запущен сборщик логов.",
  },
  unavailable: {
    title: "Логи недоступны",
    text: "Не удалось прочитать Redis. Проверьте REDIS_URL и что сервис logs запущен.",
  },
  truncated:
    "Показаны последние {shown} из {total} записей. Сузьте фильтры, чтобы увидеть остальные.",
};
