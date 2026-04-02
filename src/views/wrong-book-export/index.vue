<script setup lang="ts">
import { practiceQuestions } from '@/data/exam'

defineOptions({
  name: 'WrongBookExport',
})

const practiceStorage = useLocalStorage('cardwinner-practice-state', {
  category: '全部',
  currentIndex: 0,
  practiceMode: 'objective',
  userAnswers: {} as Record<number, string | boolean>,
  fillAnswers: {} as Record<number, string>,
  fillIndex: 0,
  shortIndex: 0,
  shortAnswers: {} as Record<number, string>,
  objectiveOrder: [] as number[],
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

function countMatchedPoints(answer: string | undefined, points: string[]) {
  const normalizedAnswer = normalizeText(answer)
  if (!normalizedAnswer)
    return 0
  return points.filter(point => normalizedAnswer.includes(normalizeText(point).slice(0, 14))).length
}

const wrongObjectiveQuestions = computed(() =>
  practiceQuestions.filter(item => {
    const answer = practiceStorage.value.userAnswers?.[item.id]
    return answer !== undefined && answer !== item.answer
  }),
)

const totalWrongCount = computed(() => wrongObjectiveQuestions.value.length)

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildWordHtml() {
  const dateText = new Date().toLocaleString('zh-CN')
  const objectiveHtml = wrongObjectiveQuestions.value.map(item => `
    <div style="margin-bottom:16px;">
      <div><strong>${item.id}. ${escapeHtml(item.stem)}</strong></div>
      <div>你的答案：${escapeHtml(String(practiceStorage.value.userAnswers?.[item.id] ?? '未作答'))}</div>
      <div>正确答案：${escapeHtml(String(item.answer === true ? '正确' : item.answer === false ? '错误' : item.answer))}</div>
      <div>解析：${escapeHtml(item.explanation)}</div>
      <div>原句依据：${escapeHtml(item.proof)}</div>
    </div>
  `).join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>卡赢考试错题本</title>
      </head>
      <body style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 24px; color: #0f172a;">
        <h1>卡赢考试错题本</h1>
        <p>导出时间：${escapeHtml(dateText)}</p>
        <h2>客观题错题</h2>
        ${objectiveHtml || '<p>暂无客观题错题</p>'}
      </body>
    </html>
  `
}

function printPage() {
  window.print()
}

function exportWord() {
  const blob = new Blob([buildWordHtml()], {
    type: 'application/msword;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '卡赢考试错题本.doc'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="wrong-book-page">
    <div class="screen-toolbar">
      <van-button type="primary" @click="printPage">
        打印 / 导出 PDF
      </van-button>
      <van-button plain @click="exportWord">
        导出 Word
      </van-button>
      <router-link class="back-link" :to="{ name: 'Practice' }">
        返回答题页
      </router-link>
    </div>

    <main class="sheet">
      <header class="hero">
        <h1>卡赢考试错题本</h1>
        <p>这里会汇总练习模式里的客观题错题。</p>
        <div class="summary">
          当前共 {{ totalWrongCount }} 项待复习
        </div>
      </header>

      <section class="block">
        <h2>客观题错题</h2>
        <div v-if="wrongObjectiveQuestions.length" class="simple-list">
          <div v-for="item in wrongObjectiveQuestions" :key="item.id" class="qa-card">
            <div class="qa-title">
              {{ item.id }}. {{ item.stem }}
            </div>
            <div class="qa-line">
              你的答案：{{ practiceStorage.userAnswers?.[item.id] === true ? '正确' : practiceStorage.userAnswers?.[item.id] === false ? '错误' : practiceStorage.userAnswers?.[item.id] }}
            </div>
            <div class="qa-line">
              正确答案：{{ item.answer === true ? '正确' : item.answer === false ? '错误' : item.answer }}
            </div>
            <div class="qa-line">
              解析：{{ item.explanation }}
            </div>
            <div class="qa-proof">
              原句依据：{{ item.proof }}
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          暂无客观题错题。
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="less">
.wrong-book-page {
  min-height: 100vh;
  background: var(--color-background-2);
  padding: 16px;
}

.screen-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.back-link {
  color: var(--color-brand);
  font-size: 14px;
}

.sheet {
  max-width: 920px;
  margin: 0 auto;
  background: var(--color-block-background);
  padding: 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
}

.hero h1 {
  margin: 0;
  font-size: 30px;
  color: var(--color-brand-deep);
}

.hero p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 24px;
  color: var(--van-text-color-2);
}

.summary {
  display: inline-flex;
  margin-top: 12px;
  border-radius: 999px;
  background: var(--color-tag-bg);
  color: var(--color-tag-text);
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
}

.block {
  margin-top: 24px;
  break-inside: avoid;
}

.block h2 {
  margin: 0 0 12px;
  font-size: 20px;
  color: var(--color-brand-deep);
}

.simple-list {
  display: grid;
  gap: 12px;
}

.qa-card {
  border-radius: 18px;
  background: var(--color-soft-card);
  padding: 16px;
}

.qa-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 26px;
  color: var(--color-brand-deep);
}

.qa-line,
.qa-proof {
  margin-top: 8px;
  font-size: 14px;
  line-height: 24px;
  color: var(--color-text);
}

.qa-proof {
  background: var(--color-scenario-bg);
  border-radius: 14px;
  padding: 10px 12px;
}

.point-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.point-item {
  border-radius: 14px;
  background: var(--color-success-bg);
  padding: 10px 12px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-success);
}

.empty-state {
  border-radius: 18px;
  background: var(--color-soft-card);
  padding: 18px;
  font-size: 14px;
  color: var(--van-text-color-2);
}

@media print {
  .wrong-book-page {
    background: #fff;
    padding: 0;
  }

  .screen-toolbar {
    display: none;
  }

  .sheet {
    box-shadow: none;
    max-width: none;
    padding: 0;
    background: #fff;
  }

  .hero h1 {
    color: #0f172a;
  }

  .hero p {
    color: #475569;
  }

  .block {
    break-inside: avoid-page;
  }

  .block h2 {
    color: #0f766e;
  }

  .qa-card {
    background: #f8fafc;
  }

  .qa-title {
    color: #0f172a;
  }

  .qa-line,
  .qa-proof {
    color: #334155;
  }

  .qa-proof {
    background: #e0f2fe;
  }

  .point-item {
    background: #dcfce7;
    color: #166534;
  }

  .empty-state {
    background: #f8fafc;
    color: #64748b;
  }

  .summary {
    background: #dbeafe;
    color: #1d4ed8;
  }
}
</style>
