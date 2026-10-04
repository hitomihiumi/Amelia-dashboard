import type { Dict } from "../types";
import type { docs as en } from "../en/docs";

export const docs: Dict<typeof en> = {
  header: {
    searchPlaceholder: "Пошук у документації…",
  },
  kbar: {
    sectionNavigation: "Навігація",
    sectionDocumentation: "Документація",
    sectionTheme: "Тема",
    home: "Головна",
    homeKeywords: "головна, домашня сторінка, home, landing page",
    lightMode: "Світла тема",
    darkMode: "Темна тема",
    themeKeywords:
      "світла тема, темна тема, тема, перемкнути, оформлення, light mode, dark mode, theme",
    defaultKeywords: "{title}, документація, docs, documentation",
  },
  page: {
    label: "Сторінка",
    lastUpdate: "Оновлено: {date}",
    viewOnGithub: "Відкрити на GitHub",
    thumbnailAlt: "Мініатюра: {title}",
  },
  mdx: {
    errorTitle: "Не вдалося показати вміст",
    errorText: "Під час показу цього вмісту сталася помилка. Спробуйте оновити сторінку.",
  },
};
