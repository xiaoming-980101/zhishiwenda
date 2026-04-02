<script setup lang="ts">
import { mustKnowItems, practiceQuestions } from '@/data/exam'

defineOptions({
  name: 'SprintMode',
})

const practiceStorage = useLocalStorage('cardwinner-practice-state', {
  category: '全部',
  currentIndex: 0,
  practiceMode: 'objective',
  userAnswers: {} as Record<number, string | boolean>,
  fillAnswers: {} as Record<number, string>,
  fillIndex: 0,
  shortIndex: 0,
  objectiveOrder: [] as number[],
})

const mockExamStorage = useLocalStorage('cardwinner-mock-exam-state', {
  objectiveAnswers: {} as Record<number, string | boolean>,
  fillAnswers: {} as Record<number, string>,
  shortAnswers: {} as Record<number, string>,
  submitted: false,
  autoSubmitted: false,
  objectiveIds: [] as number[],
  fillIds: [] as number[],
  shortIds: [] as number[],
  objectiveOrder: [] as number[],
  fillOrder: [] as number[],
  shortOrder: [] as number[],
  optionOrder: {} as Record<number, string[]>,
})

function normalizeText(value?: string) {
  return (value || '').replace(/\s+/g, '').replace(/[，。、“”‘’：；（）()\-_/]/g, '').toLowerCase()
}

function isFillCorrect(keywords: string[], value?: string) {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue)
    return false
  return keywords.every(keyword => normalizedValue.includes(normalizeText(keyword)))
}

const wrongQuestions = computed(() =>
  practiceQuestions.filter(item => {
    const answer = practiceStorage.value.userAnswers[item.id]
    return answer !== undefined && answer !== item.answer
  }).slice(0, 8),
)

const weakAreas = computed(() => {
  const grouped = new Map<string, { wrong: number, total: number }>()
  for (const item of practiceQuestions) {
    const current = grouped.get(item.category) || { wrong: 0, total: 0 }
    current.total += 1
    if (practiceStorage.value.userAnswers[item.id] !== undefined && practiceStorage.value.userAnswers[item.id] !== item.answer)
      current.wrong += 1
    grouped.set(item.category, current)
  }
  return [...grouped.entries()]
    .filter(([, value]) => value.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 4)
})

const sprintMustKnow = computed(() => mustKnowItems.slice(0, 10))

const quickActions = [
  { title: '回错题本', to: { name: 'Practice' } },
  { title: '看高频必背', to: { name: 'Memory' } },
  { title: '再做一套模考', to: { name: 'MockExam' } },
  { title: '打印速记页', to: { name: 'PrintPack' } },
]
</script>

<template>
  <div class="px-[12px] pt-[12px] pb-[90px] space-y-[14px]">
    <section class="hero rounded-[24px] p-[18px] text-white">
      <div class="text-[12px] tracking-[2px] uppercase opacity-80">
        Final Sprint
      </div>
      <div class="text-[26px] font-bold mt-[8px]">
        考前冲刺模式
      </div>
      <p class="text-[14px] leading-[24px] mt-[10px] text-white/85">
        这里只保留临考最值得反复看的内容：你的错题、当前薄弱项、高频必背和简答框架。
      </p>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        快速入口
      </div>
      <div class="grid grid-cols-2 gap-[10px] mt-[12px]">
        <router-link
          v-for="item in quickActions"
          :key="item.title"
          :to="item.to"
          class="quick-link"
        >
          {{ item.title }}
        </router-link>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        当前最薄弱的 4 类
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="[name, item] in weakAreas"
          :key="name"
          class="rounded-[14px] bg-[var(--color-soft-card)] px-[12px] py-[10px] text-[14px]"
        >
          {{ name }}：错了 {{ item.wrong }} 次 / 共 {{ item.total }} 题
        </div>
        <div v-if="!weakAreas.length" class="text-[14px] text-[var(--van-text-color-2)]">
          当前没有明显薄弱项，可以直接去做一套新模考。
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        优先回看错题
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="item in wrongQuestions"
          :key="item.id"
          class="rounded-[14px] border border-[var(--color-border)] px-[12px] py-[10px]"
        >
          <div class="font-bold text-[14px] text-[var(--color-brand-deep)]">
            {{ item.category }} · 第 {{ item.id }} 题
          </div>
          <div class="text-[14px] leading-[24px] mt-[6px]">
            {{ item.stem }}
          </div>
          <div class="text-[13px] leading-[22px] text-[var(--van-text-color-2)] mt-[6px]">
            正确答案：{{ item.answer === true ? '正确' : item.answer === false ? '错误' : item.answer }}
          </div>
          <div class="text-[13px] leading-[22px] text-[var(--van-text-color-2)]">
            依据：{{ item.proof }}
          </div>
        </div>
        <div v-if="!wrongQuestions.length" class="text-[14px] text-[var(--van-text-color-2)]">
          还没有客观题错题记录。
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        高频必背 10 条
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="item in sprintMustKnow"
          :key="item.id"
          class="rounded-[14px] bg-[var(--color-soft-card)] px-[12px] py-[10px]"
        >
          <div class="font-bold text-[14px] text-[var(--color-brand-deep)]">
            {{ item.id }}. {{ item.title }}
          </div>
          <div class="text-[14px] leading-[24px] mt-[4px]">
            {{ item.answer }}
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="mockExamStorage.submitted"
      class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card"
    >
      <div class="section-title">
        最近模考状态
      </div>
      <div class="tip-box mt-[12px]">
        {{ mockExamStorage.autoSubmitted ? '上一套模考是自动交卷的，建议再做一套新的随机卷。' : '最近一套模考已完成，建议先回顾错题后再开新卷。' }}
      </div>
    </section>
  </div>
</template>

<style scoped lang="less">
.hero {
  background:
    radial-gradient(circle at top left, rgba(254, 240, 138, 0.3), transparent 30%),
    linear-gradient(135deg, #7f1d1d, #b91c1c 48%, #f97316);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.shadow-card {
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.quick-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  border-radius: 16px;
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  font-size: 14px;
  font-weight: 700;
}

.tip-box {
  border-radius: 14px;
  padding: 12px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 14px;
  line-height: 24px;
}
</style>
