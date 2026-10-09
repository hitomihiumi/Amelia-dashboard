import type { Dict } from "../types";
import type { layouts as en } from "../en/layouts";

export const layouts: Dict<typeof en> = {
  fallbackName: "Макет",
  nameLabel: "Назва (внутрішня)",

  tab: {
    label: "Макети",
    newItem: "Новий макет",
    emptyText:
      "Створіть перший макет, щоб зібрати гарне повідомлення з контейнерів, тексту, зображень і кнопок.",
    componentsCount:
      "{count}/{max} {count, plural, one {компонент} few {компоненти} many {компонентів} other {компонента}}",
    usedIn:
      "{count, plural, one {Використовується в # сценарії} few {Використовується в # сценаріях} many {Використовується в # сценаріях} other {Використовується в # сценарії}}",
    deleteUsedConfirm:
      "{count, plural, one {Цей макет використовується в # сценарії. Усе одно видалити?} few {Цей макет використовується в # сценаріях. Усе одно видалити?} many {Цей макет використовується в # сценаріях. Усе одно видалити?} other {Цей макет використовується в # сценарії. Усе одно видалити?}}",
    limitReached: "На сервері може бути не більше {max} макетів.",
  },

  defaults: {
    name: "Новий макет",
    title: "Оголошення",
    text: "Привіт, {token}! Напишіть тут своє повідомлення. Можна використовувати **жирний текст**, списки та плейсхолдери.",
    sectionText: "Текст поруч із картинкою",
  },

  empty: {
    title: "Додайте перший блок",
    text: "Макет збирається з блоків: тексту, зображень, кнопок і контейнерів, що їх об'єднують.",
    add: "Додати перший блок",
  },

  add: {
    button: "Додати блок",
    toContainer: "Додати блок у контейнер",
    groupContent: "Вміст",
    groupInteractive: "Інтерактив",
    groupLayout: "Структура",
  },

  blocks: {
    unknown: "Блок",
    text: { label: "Текст", description: "Markdown-текст: заголовки, списки, цитати" },
    section: { label: "Секція", description: "Текст із мініатюрою або кнопкою збоку" },
    gallery: { label: "Галерея", description: "До 10 зображень мозаїкою" },
    separator: { label: "Роздільник", description: "Лінія або порожнє місце" },
    buttons: { label: "Ряд кнопок", description: "До 5 ваших збережених кнопок" },
    select: { label: "Ряд із меню вибору", description: "Одне з ваших збережених меню вибору" },
    actions: { label: "Ряд" },
    container: { label: "Контейнер", description: "Картка з кольоровою смугою, що об'єднує блоки" },
  },

  blockRef: {
    top: "блок {n} ({type})",
    child: "блок {n} ({type}) › блок {m} ({childType})",
  },

  block: {
    drag: "Перетягніть, щоб змінити порядок",
    dragHint: "Перетягніть або натискайте стрілки вгору та вниз",
    delete: "Видалити блок",
    deleteContainerConfirm:
      "{count, plural, one {Видалити контейнер і його блок?} few {Видалити контейнер і його # блоки?} many {Видалити контейнер і його # блоків?} other {Видалити контейнер і його # блока?}}",
    expand: "Розгорнути",
    collapse: "Згорнути",
    expandAll: "Розгорнути всі",
    collapseAll: "Згорнути всі",
    dropHere: "Перетягніть сюди",
  },

  budget: {
    components: "Компоненти",
    text: "Символи тексту",
    issues: "{count, plural, one {# проблема} few {# проблеми} many {# проблем} other {# проблеми}}",
    valid: "Можна зберігати",
  },

  summary: {
    emptyText: "Порожній текст",
    images:
      "{count, plural, one {# зображення} few {# зображення} many {# зображень} other {# зображення}}",
    dividerLine: "Лінія, {spacing}",
    dividerSpace: "Порожнє місце, {spacing}",
    noButtons: "Кнопки не вибрано",
    noSelect: "Меню вибору не вибрано",
    blocks: "{count, plural, one {# блок} few {# блоки} many {# блоків} other {# блока}}",
  },

  text: {
    label: "Текст",
    placeholder: "Напишіть текст…",
    chars: "{count, plural, one {# символ} few {# символи} many {# символів} other {# символа}}",
    markdownHint:
      "Тут працює markdown Discord: **жирний**, *курсив*, # заголовки, - списки, > цитати та ||спойлери||.",
  },

  separator: {
    divider: "Показувати лінію",
    dividerHint: "Якщо вимкнути, залишиться лише порожнє місце.",
    spacing: "Відступ",
    small: "Малий",
    large: "Великий",
  },

  gallery: {
    items: "Зображення ({count}/{max})",
    addItem: "Додати зображення",
    removeItem: "Видалити зображення",
    itemTitle: "Зображення {n}",
  },

  media: {
    url: "Посилання на зображення або відео",
    description: "Опис (альтернативний текст)",
    spoiler: "Позначити як спойлер",
    ok: "Посилання працює",
    failed: "Не вдалося завантажити зображення за цим посиланням",
    placeholderNote: "Плейсхолдер буде замінено під час надсилання повідомлення.",
  },

  section: {
    textTitle: "Текст {n}",
    addText: "Додати текст ({count}/{max})",
    removeText: "Видалити цей текст",
    accessory: "Поруч із текстом",
    thumbnail: "Мініатюра",
    button: "Кнопка",
    pickButton: "Кнопка",
    pickButtonPlaceholder: "Виберіть збережену кнопку…",
  },

  actions: {
    modeButtons: "Кнопки",
    modeSelect: "Меню вибору",
    buttonsCount: "Кнопки ({count}/{max})",
    missingButton: "Видалена кнопка",
    removeButton: "Прибрати з ряду",
    addButton: "Додати кнопку",
    addButtonPlaceholder: "Виберіть збережену кнопку…",
    noMoreButtons: "Інших кнопок немає",
    rowFull: "Ряд заповнено (кнопок: {max}).",
    pickSelect: "Меню вибору",
    pickSelectPlaceholder: "Виберіть збережене меню вибору…",
  },

  pickers: {
    usedElsewhere: "Уже використовується в цьому макеті",
    noButtons: "У вас поки немає збережених кнопок. Спочатку створіть кнопку на вкладці «Кнопки».",
    noSelectMenus:
      "У вас поки немає збережених меню вибору. Спочатку створіть меню на вкладці «Меню вибору».",
    gotoButtons: "Відкрити «Кнопки»",
    gotoSelectMenus: "Відкрити «Меню вибору»",
  },

  container: {
    accent: "Колір смуги",
    spoiler: "Приховати під спойлером",
    spoilerHint: "Щоб побачити контейнер повністю, учасникам потрібно натиснути на нього.",
  },

  preview: {
    empty: "Макет порожній. Додайте блок, щоб побачити його тут.",
    emptyContainer: "Порожній контейнер",
    emptyRow: "Порожній ряд",
    missingButton: "Кнопку видалено",
    missingSelect: "Меню вибору видалено",
    mediaEmpty: "Немає зображення",
    mediaFailed: "Зображення недоступне",
    spoiler: "Спойлер",
    revealSpoiler: "Показати спойлер",
  },

  issues: {
    nameLength: "Дайте макету назву завдовжки від 1 до {max} символів.",
    empty: "Додайте хоча б один блок.",
    emptyContainer: "Цей контейнер порожній. Додайте до нього блок або видаліть його.",
    tooManyComponents:
      "У макеті {count} компонентів, а Discord дозволяє {max}. Кнопки, меню та тексти секцій теж враховуються.",
    textTooLong: "У макеті {length} символів тексту, а Discord дозволяє {max} загалом.",
    textEmpty: "Цей текст порожній.",
    galleryEmpty: "Додайте хоча б одне зображення.",
    galleryTooMany: "У галереї може бути не більше {max} зображень.",
    mediaUrlInvalid: "Введіть посилання http(s) або плейсхолдер, який стане посиланням.",
    descriptionTooLong: "Опис може містити не більше {max} символів.",
    sectionTexts: "У секції має бути від 1 до {max} текстів.",
    sectionAccessoryMissing: "Виберіть для цієї секції мініатюру або кнопку.",
    buttonMissing: "Кнопки «{name}» більше не існує. Виберіть іншу.",
    selectMenuMissing: "Меню вибору «{name}» більше не існує. Виберіть інше.",
    duplicateInteractive:
      "«{name}» уже використовується в цьому макеті. Discord не дозволяє двічі додати ту саму кнопку чи меню.",
    rowEmpty: "Виберіть для цього ряду хоча б одну кнопку або меню вибору.",
    rowMixed: "У ряду можуть бути кнопки або меню вибору, але не одне й інше разом.",
    rowTooManyButtons: "У ряду може бути не більше {max} кнопок.",
    accentColorInvalid: "Колір смуги має виглядати так: #5865f2.",
    duplicateId:
      "У цього блока той самий внутрішній id, що й в іншого. Продублюйте блок кнопкою, а не копіюванням.",
    unknownType: "Такий тип блока тут не підтримується.",
  },

  errors: {
    layoutIssue: "Макет «{layout}»: {message}",
    blockIssue: "Макет «{layout}», {block}: {message}",
    tooMany: "На сервері може бути не більше {max} макетів.",
    missingId: "Макет {n}: не вказано id",
    duplicateId: "Макет: повторюваний id «{id}»",
    malformed: "Макет «{layout}»: дані пошкоджено",
  },
};
