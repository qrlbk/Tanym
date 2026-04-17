/**
 * Beat-sheet шаблоны для планирования романа. Используются:
 *  - UI-панелью outline planner (roadmap фаза 5)
 *  - AI-инструментом `generate_beat_sheet` (см. `src/lib/ai/tools.ts`)
 *
 * Каждый beat — это якорь сюжета с долей (`position` 0..1) от длины истории
 * и коротким описанием, что именно должно произойти. Структура намеренно
 * простая и текстовая: шаблон подмешивается в промпт, модель заполняет сцены.
 */

export type BeatSheetTemplateId =
  | "save-the-cat"
  | "three-act"
  | "heros-journey";

export type BeatDefinition = {
  id: string;
  /** Русское имя beat'а для UI. */
  label: string;
  /** Положение на дуге, 0..1 (approx). */
  position: number;
  /** Короткое объяснение, что должно произойти. */
  description: string;
};

export type BeatSheetTemplate = {
  id: BeatSheetTemplateId;
  label: string;
  /** 1–2 фразы для UI — кому и зачем этот шаблон. */
  summary: string;
  /** Примерный диапазон длин (слова), на которых шаблон работает лучше всего. */
  recommendedLength: { min: number; max: number };
  beats: BeatDefinition[];
};

export const SAVE_THE_CAT: BeatSheetTemplate = {
  id: "save-the-cat",
  label: "Save the Cat (Blake Snyder)",
  summary:
    "15 beat'ов для жанровых романов и коммерческой прозы. Хорошо держит темп, явные перелом­ные моменты.",
  recommendedLength: { min: 60_000, max: 120_000 },
  beats: [
    {
      id: "opening_image",
      label: "Opening Image",
      position: 0.0,
      description:
        "Первая сцена — снимок мира героя до перемен. Задаёт тон и визуальный контраст с финалом.",
    },
    {
      id: "theme_stated",
      label: "Theme Stated",
      position: 0.05,
      description:
        "Кто-то проговаривает главную тему/моральный вопрос. Герой её пока не слышит.",
    },
    {
      id: "setup",
      label: "Setup",
      position: 0.1,
      description:
        "Знакомство с героем и его миром: привычки, недостаток, окружение. Закладываем будущие арки.",
    },
    {
      id: "catalyst",
      label: "Catalyst",
      position: 0.12,
      description: "Событие, которое ломает статус-кво героя. Точка невозврата близко.",
    },
    {
      id: "debate",
      label: "Debate",
      position: 0.18,
      description: "Герой сомневается. Внутренний конфликт: идти или остаться.",
    },
    {
      id: "break_into_two",
      label: "Break into Two",
      position: 0.22,
      description: "Герой делает выбор и входит в новый мир истории.",
    },
    {
      id: "b_story",
      label: "B Story",
      position: 0.27,
      description:
        "Второстепенная сюжетная линия (часто love interest), через неё раскроется тема.",
    },
    {
      id: "fun_and_games",
      label: "Fun and Games",
      position: 0.35,
      description:
        "«Обещание жанра» — то, ради чего читатель пришёл: приключения, расследование, магия.",
    },
    {
      id: "midpoint",
      label: "Midpoint",
      position: 0.5,
      description:
        "Ложная победа или ложное поражение. Ставки удваиваются, время начинает жать.",
    },
    {
      id: "bad_guys_close_in",
      label: "Bad Guys Close In",
      position: 0.6,
      description:
        "Внешнее давление растёт, союзники ссорятся, внутренние слабости героя обостряются.",
    },
    {
      id: "all_is_lost",
      label: "All Is Lost",
      position: 0.75,
      description:
        "Темнее всего перед рассветом. Герой теряет важное — часто смерть ментора или надежды.",
    },
    {
      id: "dark_night",
      label: "Dark Night of the Soul",
      position: 0.78,
      description: "Герой на дне. Осознание того, о чём говорил Theme Stated.",
    },
    {
      id: "break_into_three",
      label: "Break into Three",
      position: 0.82,
      description:
        "Синтез: герой нашёл ответ (обычно через B-story) и видит путь к финалу.",
    },
    {
      id: "finale",
      label: "Finale",
      position: 0.9,
      description: "Развязка. Герой применяет урок, решает центральный конфликт.",
    },
    {
      id: "final_image",
      label: "Final Image",
      position: 1.0,
      description:
        "Зеркало Opening Image — показывает, как герой и мир изменились.",
    },
  ],
};

export const THREE_ACT: BeatSheetTemplate = {
  id: "three-act",
  label: "Трёх­акт­ная структура",
  summary:
    "Классика: Setup / Confrontation / Resolution с двумя plot points. Хорошо для литературного и нежанрового романа.",
  recommendedLength: { min: 50_000, max: 150_000 },
  beats: [
    {
      id: "act1_hook",
      label: "Hook",
      position: 0.0,
      description: "Цепляющее начало — вопрос, образ, действие, втягивающее читателя.",
    },
    {
      id: "act1_inciting",
      label: "Inciting Incident",
      position: 0.12,
      description: "Событие, запускающее основной конфликт истории.",
    },
    {
      id: "plot_point_1",
      label: "Plot Point 1",
      position: 0.25,
      description: "Конец первого акта. Герой окончательно вовлечён, путь назад закрыт.",
    },
    {
      id: "act2_rising",
      label: "Rising Action",
      position: 0.4,
      description: "Препятствия нарастают, герой учится, союзники/противники раскрываются.",
    },
    {
      id: "midpoint",
      label: "Midpoint",
      position: 0.5,
      description: "Поворотный момент: смена цели, открытие правды, ложный успех/поражение.",
    },
    {
      id: "plot_point_2",
      label: "Plot Point 2",
      position: 0.75,
      description:
        "Конец второго акта: кризис, кажется всё потеряно; герой готов к финальной попытке.",
    },
    {
      id: "climax",
      label: "Climax",
      position: 0.9,
      description: "Главный конфликт решается. Максимум напряжения.",
    },
    {
      id: "resolution",
      label: "Resolution",
      position: 1.0,
      description: "Спад, новая норма, ответ на главный вопрос истории.",
    },
  ],
};

export const HEROS_JOURNEY: BeatSheetTemplate = {
  id: "heros-journey",
  label: "Путь героя (Campbell/Vogler)",
  summary:
    "12 стадий — миф, фэнтези, подростковый YA. Мощная архетипика, работает для трансформации героя.",
  recommendedLength: { min: 70_000, max: 200_000 },
  beats: [
    {
      id: "ordinary_world",
      label: "Ordinary World",
      position: 0.0,
      description: "Обычный мир героя — со всеми ограничениями и несправедливостями.",
    },
    {
      id: "call_to_adventure",
      label: "Call to Adventure",
      position: 0.1,
      description: "Зов приключения — герой узнаёт о большой проблеме/задании.",
    },
    {
      id: "refusal",
      label: "Refusal of the Call",
      position: 0.15,
      description: "Герой сомневается или отказывается. Причины страха эксплуатируются в финале.",
    },
    {
      id: "mentor",
      label: "Meeting the Mentor",
      position: 0.2,
      description: "Появляется наставник — даёт знание, дар или совет.",
    },
    {
      id: "crossing_threshold",
      label: "Crossing the Threshold",
      position: 0.25,
      description: "Герой покидает обычный мир и попадает в особый мир истории.",
    },
    {
      id: "tests_allies",
      label: "Tests, Allies, Enemies",
      position: 0.4,
      description: "Серия испытаний. Герой обретает команду и впервые сталкивается с антагонистом.",
    },
    {
      id: "innermost_cave",
      label: "Approach to the Inmost Cave",
      position: 0.5,
      description: "Подготовка к центральному испытанию. Часто — планирование, замирание.",
    },
    {
      id: "ordeal",
      label: "Ordeal",
      position: 0.6,
      description: "Смертельное испытание, символическая смерть и возрождение героя.",
    },
    {
      id: "reward",
      label: "Reward (Seizing the Sword)",
      position: 0.7,
      description: "Герой получает награду — предмет, знание, отношения.",
    },
    {
      id: "road_back",
      label: "The Road Back",
      position: 0.8,
      description: "Путь домой. Последствия награды догоняют — преследование, цена.",
    },
    {
      id: "resurrection",
      label: "Resurrection",
      position: 0.9,
      description:
        "Финальное испытание, окончательная трансформация героя. Он жертвует чем-то важным.",
    },
    {
      id: "return",
      label: "Return with the Elixir",
      position: 1.0,
      description: "Возвращение в обычный мир с даром, который меняет его и мир вокруг.",
    },
  ],
};

export const BEAT_SHEET_TEMPLATES: readonly BeatSheetTemplate[] = [
  SAVE_THE_CAT,
  THREE_ACT,
  HEROS_JOURNEY,
];

export function getBeatSheetTemplate(
  id: BeatSheetTemplateId,
): BeatSheetTemplate {
  const found = BEAT_SHEET_TEMPLATES.find((t) => t.id === id);
  if (!found) {
    throw new Error(`Unknown beat sheet template: ${id}`);
  }
  return found;
}

/**
 * Подготавливает markdown-представление шаблона для подмешивания в system prompt.
 * Модель использует его, чтобы выдать пользовательский beat sheet.
 */
export function renderBeatSheetTemplateForPrompt(
  template: BeatSheetTemplate,
  premise: string,
): string {
  const lines: string[] = [];
  lines.push(`# Шаблон "${template.label}"`);
  lines.push("");
  lines.push(template.summary);
  lines.push("");
  lines.push(`## Премиса`);
  lines.push(premise.trim() || "(премиса не задана — спросить у пользователя)");
  lines.push("");
  lines.push("## Структура");
  for (const beat of template.beats) {
    const pos = Math.round(beat.position * 100);
    lines.push(`- **${beat.label}** (${pos}%) — ${beat.description}`);
  }
  return lines.join("\n");
}
