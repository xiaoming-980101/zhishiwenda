<script setup lang="ts">
import { examNotice, examScopeCards, noticeCards, platformCards, practiceQuestions, productCards, sprintChecklist } from '@/data/exam'

defineOptions({
  name: 'Home',
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

const safeMockExamStorage = computed(() => ({
  ...mockExamStorage.value,
  objectiveAnswers: mockExamStorage.value.objectiveAnswers || {},
  fillAnswers: mockExamStorage.value.fillAnswers || {},
  shortAnswers: mockExamStorage.value.shortAnswers || {},
  submitted: Boolean(mockExamStorage.value.submitted),
  autoSubmitted: Boolean(mockExamStorage.value.autoSubmitted),
  objectiveIds: Array.isArray(mockExamStorage.value.objectiveIds) ? mockExamStorage.value.objectiveIds : [],
  fillIds: Array.isArray(mockExamStorage.value.fillIds) ? mockExamStorage.value.fillIds : [],
  shortIds: Array.isArray(mockExamStorage.value.shortIds) ? mockExamStorage.value.shortIds : [],
}))

const daysLeft = computed(() => {
  const target = new Date('2026-03-30T16:00:00+08:00').getTime()
  const now = Date.now()
  const diff = target - now
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0
})

function normalizeText(value?: string) {
  return (value || '').replace(/\s+/g, '').replace(/[，。、""'':；（）()\-_/]/g, '').toLowerCase()
}

function isFillCorrect(keywords: string[], value?: string) {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue)
    return false
  return keywords.every(keyword => normalizedValue.includes(normalizeText(keyword)))
}

function countMatchedPoints(answer: string | undefined, points: string[]) {
  const normalizedAnswer = normalizeText(answer)
  if (!normalizedAnswer)
    return 0
  return points.filter(point => normalizedAnswer.includes(normalizeText(point).slice(0, 14))).length
}

const objectiveProgress = computed(() => {
  const answers = practiceStorage.value.userAnswers
  const answered = practiceQuestions.filter(item => answers[item.id] !== undefined).length
  const correct = practiceQuestions.filter(item => answers[item.id] === item.answer).length
  const wrong = practiceQuestions.filter(item => answers[item.id] !== undefined && answers[item.id] !== item.answer).length
  return {
    answered,
    correct,
    wrong,
    rate: answered ? Math.round((correct / answered) * 100) : 0,
  }
})

const recentMockScore = computed(() => {
  const objectiveQuestions = practiceQuestions.filter(item => safeMockExamStorage.value.objectiveIds.includes(item.id))
  if (!objectiveQuestions.length)
    return 0
  const objectiveCorrect = objectiveQuestions.filter(item => safeMockExamStorage.value.objectiveAnswers[item.id] === item.answer).length
  const objectiveScore = Math.round((objectiveCorrect / objectiveQuestions.length) * 100)
  return safeMockExamStorage.value.submitted ? Math.min(objectiveScore, 100) : 0
})

const weakAreas = computed(() => {
  return [...new Set(
    practiceQuestions
      .filter(item => practiceStorage.value.userAnswers[item.id] !== undefined && practiceStorage.value.userAnswers[item.id] !== item.answer)
      .map(item => item.category),
  )].slice(0, 3)
})

const stats = computed(() => [
  { label: '核心平台', value: `${platformCards.length}` },
  { label: '关键产品', value: `${productCards.length}` },
  { label: '及格线', value: `${examNotice.passScore}` },
  { label: '倒计时', value: `${daysLeft.value} 天` },
])

const progressCards = computed(() => [
  { label: '已刷客观题', value: `${objectiveProgress.value.answered}/${practiceQuestions.length}` },
  { label: '当前正确率', value: `${objectiveProgress.value.rate}%` },
  { label: '累计错题', value: `${objectiveProgress.value.wrong}` },
  { label: '最近模考', value: safeMockExamStorage.value.submitted ? `${recentMockScore.value} 分` : '未交卷' },
])

const focusTopics = [
  '产品定义：通用型产品、卡控专属产品、赢商城专属产品',
  '平台归属：卡控、星辰、赢商城分别负责什么',
  '收入确认：业务使用哪个前端平台，收入就归哪个平台',
  '场景判断：微信立减金、数字权益、企业福利、外部直发、保险推广、车生活服务',
]
</script>

<template>
  <div class="px-[12px] pt-[12px] pb-[90px] space-y-[14px]">
    <section class="hero-card rounded-[24px] p-[18px] text-white overflow-hidden">
      <div class="text-[13px] tracking-[2px] uppercase opacity-80">
        Exam Sprint
      </div>
      <h1 class="text-[26px] leading-[34px] font-bold mt-[8px]">
        {{ examNotice.title }}
      </h1>
      <p class="text-[14px] leading-[24px] mt-[10px] text-white/85">
        这套应用把考试真正要考的四条主线压缩出来了：产品定义、平台归属、收入确认原则、实际业务场景判断。
      </p>
      <div class="mt-[16px] flex flex-wrap gap-[8px]">
        <van-tag round plain color="rgba(27, 83, 186,0.9)" text-color="rgba(27, 83, 186,0.95)">
          时长 {{ examNotice.duration }}
        </van-tag>
        <van-tag round plain color="rgba(27, 83, 186,0.9)" text-color="rgba(27, 83, 186,0.95)">
          总分 {{ examNotice.totalScore }}
        </van-tag>
        <van-tag round plain color="rgba(27, 83, 186,0.9)" text-color="rgba(27, 83, 186,0.95)">
          及格 {{ examNotice.passScore }}
        </van-tag>
        <van-tag round plain color="rgba(27, 83, 186,0.9)" text-color="rgba(27, 83, 186,0.95)">
          {{ examNotice.questionTypes.join(' / ') }}
        </van-tag>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-[10px]">
      <div
        v-for="item in stats"
        :key="item.label"
        class="rounded-[18px] bg-[var(--color-block-background)] p-[14px] shadow-card"
      >
        <div class="text-[12px] text-[var(--van-text-color-2)]">
          {{ item.label }}
        </div>
        <div class="text-[24px] font-bold mt-[6px] text-[var(--color-brand-deep)]">
          {{ item.value }}
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        学习进度
      </div>
      <div class="grid grid-cols-2 gap-[10px] mt-[12px]">
        <div
          v-for="item in progressCards"
          :key="item.label"
          class="progress-box"
        >
          <div class="text-[12px] text-[var(--van-text-color-2)]">
            {{ item.label }}
          </div>
          <div class="text-[22px] font-bold mt-[6px] text-[var(--color-brand-deep)]">
            {{ item.value }}
          </div>
        </div>
      </div>
      <div class="mt-[12px]">
        <div class="text-[13px] text-[var(--van-text-color-2)]">
          当前薄弱项
        </div>
        <div class="flex flex-wrap gap-[8px] mt-[8px]">
          <van-tag
            v-for="item in weakAreas"
            :key="item"
            type="danger"
            plain
            round
          >
            {{ item }}
          </van-tag>
          <span v-if="!weakAreas.length" class="text-[13px] text-[var(--van-text-color-2)]">
            暂无明显薄弱项，继续保持。
          </span>
        </div>
      </div>
      <router-link class="sprint-link mt-[12px]" :to="{ name: 'SprintMode' }">
        进入考前冲刺模式
      </router-link>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        重点盯这 4 类题
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="topic in focusTopics"
          :key="topic"
          class="rounded-[14px] bg-[var(--color-soft-card)] px-[12px] py-[10px] text-[14px] leading-[22px] text-[var(--color-text)]"
        >
          {{ topic }}
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        考试覆盖范围
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="item in examScopeCards"
          :key="item.title"
          class="rounded-[14px] bg-[var(--color-soft-card)] px-[12px] py-[10px]"
        >
          <div class="font-bold text-[14px] text-[var(--color-brand-deep)]">
            {{ item.title }}
          </div>
          <div class="text-[14px] leading-[24px] mt-[4px] text-[var(--color-text)]">
            {{ item.content }}
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        考前速过清单
      </div>
      <div class="mt-[12px] space-y-[12px]">
        <div
          v-for="(item, index) in sprintChecklist"
          :key="item"
          class="flex gap-[10px]"
        >
          <div class="step-chip">
            {{ index + 1 }}
          </div>
          <div class="text-[14px] leading-[24px] flex-1 text-[var(--color-text)]">
            {{ item }}
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        通知里的高频细节
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="item in noticeCards"
          :key="item.title"
          class="rounded-[14px] border border-[var(--color-border)] px-[12px] py-[10px]"
        >
          <div class="font-bold text-[14px] text-[var(--color-brand-deep)]">
            {{ item.title }}
          </div>
          <div class="text-[14px] leading-[24px] mt-[4px] text-[var(--color-text)]">
            {{ item.content }}
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        场次提醒
      </div>
      <div class="mt-[12px] space-y-[10px]">
        <div
          v-for="session in examNotice.sessions"
          :key="session"
          class="rounded-[14px] border border-[var(--color-border)] px-[12px] py-[10px] text-[14px] text-[var(--color-text)]"
        >
          {{ session }}
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="less">
.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 236, 179, 0.42), transparent 32%),
    radial-gradient(circle at left bottom, rgba(255, 255, 255, 0.18), transparent 28%),
    linear-gradient(135deg, #0f766e, #155e75 52%, #1d4ed8);
  box-shadow: 0 18px 40px rgba(15, 118, 110, 0.22);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.shadow-card {
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.progress-box {
  border-radius: 16px;
  padding: 12px;
  background: var(--color-soft-card);
}

.sprint-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  padding: 0 14px;
  background: var(--color-soft-card);
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
}

.step-chip {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>