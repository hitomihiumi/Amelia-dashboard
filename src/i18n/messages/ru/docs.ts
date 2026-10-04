import type { Dict } from "../types";
import type { docs as en } from "../en/docs";

export const docs: Dict<typeof en> = {
  header: {
    searchPlaceholder: "Поиск по документации…",
  },
  kbar: {
    sectionNavigation: "Навигация",
    sectionDocumentation: "Документация",
    sectionTheme: "Тема",
    home: "Главная",
    homeKeywords: "главная, домашняя страница, home, landing page",
    lightMode: "Светлая тема",
    darkMode: "Тёмная тема",
    themeKeywords:
      "светлая тема, тёмная тема, тема, переключить, оформление, light mode, dark mode, theme",
    defaultKeywords: "{title}, документация, docs, documentation",
  },
  page: {
    label: "Страница",
    lastUpdate: "Обновлено: {date}",
    viewOnGithub: "Открыть на GitHub",
    thumbnailAlt: "Миниатюра: {title}",
  },
  mdx: {
    errorTitle: "Не удалось отобразить содержимое",
    errorText: "При отображении этого содержимого произошла ошибка. Попробуйте обновить страницу.",
  },
};
