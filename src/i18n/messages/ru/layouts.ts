import type { Dict } from "../types";
import type { layouts as en } from "../en/layouts";

export const layouts: Dict<typeof en> = {
  fallbackName: "Макет",
  nameLabel: "Название (внутреннее)",

  tab: {
    label: "Макеты",
    newItem: "Новый макет",
    emptyText:
      "Создайте первый макет, чтобы собрать красивое сообщение из контейнеров, текста, изображений и кнопок.",
    componentsCount:
      "{count}/{max} {count, plural, one {компонент} few {компонента} many {компонентов} other {компонента}}",
    usedIn:
      "{count, plural, one {Используется в # сценарии} few {Используется в # сценариях} many {Используется в # сценариях} other {Используется в # сценария}}",
    deleteUsedConfirm:
      "{count, plural, one {Этот макет используется в # сценарии. Всё равно удалить?} few {Этот макет используется в # сценариях. Всё равно удалить?} many {Этот макет используется в # сценариях. Всё равно удалить?} other {Этот макет используется в # сценария. Всё равно удалить?}}",
    limitReached: "На сервере может быть не больше {max} макетов.",
  },

  defaults: {
    name: "Новый макет",
    title: "Объявление",
    text: "Привет, {token}! Напишите здесь своё сообщение. Можно использовать **жирный текст**, списки и плейсхолдеры.",
    sectionText: "Текст рядом с картинкой",
  },

  empty: {
    title: "Добавьте первый блок",
    text: "Макет собирается из блоков: текста, изображений, кнопок и контейнеров, которые их объединяют.",
    add: "Добавить первый блок",
  },

  add: {
    button: "Добавить блок",
    toContainer: "Добавить блок в контейнер",
    groupContent: "Содержимое",
    groupInteractive: "Интерактив",
    groupLayout: "Структура",
  },

  blocks: {
    unknown: "Блок",
    text: { label: "Текст", description: "Markdown-текст: заголовки, списки, цитаты" },
    section: { label: "Секция", description: "Текст с миниатюрой или кнопкой сбоку" },
    gallery: { label: "Галерея", description: "До 10 изображений мозаикой" },
    separator: { label: "Разделитель", description: "Линия или пустое место" },
    buttons: { label: "Ряд кнопок", description: "До 5 ваших сохранённых кнопок" },
    select: { label: "Ряд с меню выбора", description: "Одно из ваших сохранённых меню выбора" },
    actions: { label: "Ряд" },
    container: { label: "Контейнер", description: "Карточка с цветной полосой, объединяющая блоки" },
  },

  blockRef: {
    top: "блок {n} ({type})",
    child: "блок {n} ({type}) › блок {m} ({childType})",
  },

  block: {
    drag: "Перетащите, чтобы изменить порядок",
    dragHint: "Перетащите или нажимайте стрелки вверх и вниз",
    delete: "Удалить блок",
    deleteContainerConfirm:
      "{count, plural, one {Удалить контейнер и его блок?} few {Удалить контейнер и его # блока?} many {Удалить контейнер и его # блоков?} other {Удалить контейнер и его # блока?}}",
    expand: "Развернуть",
    collapse: "Свернуть",
    expandAll: "Развернуть все",
    collapseAll: "Свернуть все",
    dropHere: "Перетащите сюда",
  },

  budget: {
    components: "Компоненты",
    text: "Символы текста",
    issues:
      "{count, plural, one {# проблема} few {# проблемы} many {# проблем} other {# проблемы}}",
    valid: "Можно сохранять",
  },

  summary: {
    emptyText: "Пустой текст",
    images:
      "{count, plural, one {# изображение} few {# изображения} many {# изображений} other {# изображения}}",
    dividerLine: "Линия, {spacing}",
    dividerSpace: "Пустое место, {spacing}",
    noButtons: "Кнопки не выбраны",
    noSelect: "Меню выбора не выбрано",
    blocks: "{count, plural, one {# блок} few {# блока} many {# блоков} other {# блока}}",
  },

  text: {
    label: "Текст",
    placeholder: "Напишите текст…",
    chars: "{count, plural, one {# символ} few {# символа} many {# символов} other {# символа}}",
    markdownHint:
      "Здесь работает markdown Discord: **жирный**, *курсив*, # заголовки, - списки, > цитаты и ||спойлеры||.",
    toolbar: "Форматирование текста",
    bold: "Жирный",
    italic: "Курсив",
    underline: "Подчёркнутый",
    strike: "Зачёркнутый",
    heading: "Заголовок (повторный клик уменьшает его)",
    list: "Маркированный список",
    quote: "Цитата",
    code: "Код в строке",
    spoiler: "Спойлер",
    placeholders: "Вставить плейсхолдер",
    placeholderHint: "Плейсхолдеры вроде {token} заменяются при отправке сообщения.",
    sampleBold: "жирный",
    sampleItalic: "курсив",
    sampleUnderline: "подчёркнутый",
    sampleStrike: "зачёркнутый",
    sampleCode: "код",
    sampleSpoiler: "спойлер",
  },

  placeholders: {
    USER_ID: "ID пользователя",
    USER_NAME: "Имя пользователя",
    USER_DISPLAY_NAME: "Отображаемое имя пользователя",
    USER_MENTION: "Упоминание пользователя",
    USER_AVATAR: "Ссылка на аватар пользователя",
    CHANNEL_ID: "ID канала",
    CHANNEL_NAME: "Название канала",
    CHANNEL_MENTION: "Упоминание канала",
    GUILD_ID: "ID сервера",
    GUILD_NAME: "Название сервера",
    GUILD_ICON: "Ссылка на иконку сервера",
    DATE: "Дата",
    TIME: "Время",
    TIMESTAMP: "Метка времени",
  },

  separator: {
    divider: "Показывать линию",
    dividerHint: "Если выключить, останется только пустое место.",
    spacing: "Отступ",
    small: "Малый",
    large: "Большой",
  },

  gallery: {
    items: "Изображения ({count}/{max})",
    addItem: "Добавить изображение",
    removeItem: "Удалить изображение",
    itemTitle: "Изображение {n}",
  },

  media: {
    url: "Ссылка на изображение или видео",
    description: "Описание (альтернативный текст)",
    spoiler: "Пометить как спойлер",
    ok: "Ссылка работает",
    failed: "Не удалось загрузить изображение по этой ссылке",
    placeholderNote: "Плейсхолдер заменится при отправке сообщения.",
  },

  section: {
    textTitle: "Текст {n}",
    addText: "Добавить текст ({count}/{max})",
    removeText: "Удалить этот текст",
    accessory: "Рядом с текстом",
    thumbnail: "Миниатюра",
    button: "Кнопка",
    pickButton: "Кнопка",
    pickButtonPlaceholder: "Выберите сохранённую кнопку…",
  },

  actions: {
    modeButtons: "Кнопки",
    modeSelect: "Меню выбора",
    buttonsCount: "Кнопки ({count}/{max})",
    missingButton: "Удалённая кнопка",
    removeButton: "Убрать из ряда",
    addButton: "Добавить кнопку",
    addButtonPlaceholder: "Выберите сохранённую кнопку…",
    noMoreButtons: "Других кнопок нет",
    rowFull: "Ряд заполнен (кнопок: {max}).",
    pickSelect: "Меню выбора",
    pickSelectPlaceholder: "Выберите сохранённое меню выбора…",
  },

  pickers: {
    usedElsewhere: "Уже используется в этом макете",
    noButtons: "У вас пока нет сохранённых кнопок. Сначала создайте кнопку на вкладке «Кнопки».",
    noSelectMenus:
      "У вас пока нет сохранённых меню выбора. Сначала создайте меню на вкладке «Меню выбора».",
    gotoButtons: "Открыть «Кнопки»",
    gotoSelectMenus: "Открыть «Меню выбора»",
  },

  container: {
    accent: "Цвет полосы",
    spoiler: "Скрыть под спойлером",
    spoilerHint: "Чтобы увидеть контейнер целиком, участникам нужно нажать на него.",
  },

  preview: {
    empty: "Макет пуст. Добавьте блок, чтобы увидеть его здесь.",
    emptyContainer: "Пустой контейнер",
    emptyRow: "Пустой ряд",
    missingButton: "Кнопка удалена",
    missingSelect: "Меню выбора удалено",
    mediaEmpty: "Нет изображения",
    mediaFailed: "Изображение недоступно",
    spoiler: "Спойлер",
    revealSpoiler: "Показать спойлер",
  },

  issues: {
    nameLength: "Дайте макету название длиной от 1 до {max} символов.",
    empty: "Добавьте хотя бы один блок.",
    emptyContainer: "Этот контейнер пуст. Добавьте в него блок или удалите его.",
    tooManyComponents:
      "В макете {count} компонентов, а Discord разрешает {max}. Кнопки, меню и тексты секций тоже считаются.",
    textTooLong: "В макете {length} символов текста, а Discord разрешает {max} суммарно.",
    textEmpty: "Этот текст пуст.",
    galleryEmpty: "Добавьте хотя бы одно изображение.",
    galleryTooMany: "В галерее может быть не больше {max} изображений.",
    mediaUrlInvalid: "Введите ссылку http(s) или плейсхолдер, который станет ссылкой.",
    descriptionTooLong: "Описание может содержать не больше {max} символов.",
    sectionTexts: "В секции должно быть от 1 до {max} текстов.",
    sectionAccessoryMissing: "Выберите для этой секции миниатюру или кнопку.",
    buttonMissing: "Кнопки «{name}» больше не существует. Выберите другую.",
    selectMenuMissing: "Меню выбора «{name}» больше не существует. Выберите другое.",
    duplicateInteractive:
      "«{name}» уже используется в этом макете. Discord не разрешает дважды добавить одну и ту же кнопку или меню.",
    rowEmpty: "Выберите для этого ряда хотя бы одну кнопку или меню выбора.",
    rowMixed: "В ряду могут быть кнопки или меню выбора, но не то и другое сразу.",
    rowTooManyButtons: "В ряду может быть не больше {max} кнопок.",
    accentColorInvalid: "Цвет полосы должен выглядеть так: #5865f2.",
    duplicateId:
      "У этого блока тот же внутренний id, что и у другого. Продублируйте блок кнопкой, а не копированием.",
    unknownType: "Такой тип блока здесь не поддерживается.",
  },

  errors: {
    layoutIssue: "Макет «{layout}»: {message}",
    blockIssue: "Макет «{layout}», {block}: {message}",
    tooMany: "На сервере может быть не больше {max} макетов.",
    missingId: "Макет {n}: не указан id",
    duplicateId: "Макет: повторяющийся id «{id}»",
    malformed: "Макет «{layout}»: данные повреждены",
  },
};
