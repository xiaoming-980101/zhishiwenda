<script setup lang="ts">
import { mustKnowItems, noticeCards, platformCards, productCards, scenarioCards } from '@/data/exam'

defineOptions({
  name: 'PrintPack',
})

function printPage() {
  window.print()
}
</script>

<template>
  <div class="print-page">
    <div class="screen-toolbar">
      <van-button type="primary" @click="printPage">
        打印 / 导出 PDF
      </van-button>
      <router-link class="back-link" :to="{ name: 'Memory' }">
        返回速记
      </router-link>
    </div>

    <main class="sheet">
      <header class="hero">
        <h1>卡赢考试速记打印包</h1>
        <p>适合考前离线背诵：通知重点、平台产品、场景判断。</p>
      </header>

      <section class="block">
        <h2>通知重点</h2>
        <div class="simple-list">
          <div v-for="item in noticeCards" :key="item.title" class="simple-item">
            <strong>{{ item.title }}</strong>：{{ item.content }}
          </div>
        </div>
      </section>

      <section class="block">
        <h2>高频必背</h2>
        <div class="simple-list">
          <div v-for="item in mustKnowItems" :key="item.id" class="simple-item">
            <strong>{{ item.id }}. {{ item.title }}</strong>：{{ item.answer }}
          </div>
        </div>
      </section>

      <section class="block">
        <h2>平台与产品</h2>
        <div class="columns">
          <div class="column">
            <h3>平台</h3>
            <div v-for="item in platformCards" :key="item.name" class="simple-item">
              <strong>{{ item.name }}</strong>：{{ item.role }}
            </div>
          </div>
          <div class="column">
            <h3>产品</h3>
            <div v-for="item in productCards" :key="item.name" class="simple-item">
              <strong>{{ item.name }}</strong>：{{ item.scene }}；归属 {{ item.platform }}
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>典型场景</h2>
        <div class="simple-list">
          <div v-for="item in scenarioCards" :key="item.title" class="simple-item">
            <strong>{{ item.title }}</strong>：{{ item.description }} 结论：{{ item.result }}
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="less">
.print-page {
  min-height: 100vh;
  background: var(--color-background-2);
  padding: 16px;
}

.screen-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-link {
  color: var(--color-brand);
  font-size: 14px;
}

.sheet {
  max-width: 900px;
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

.block {
  margin-top: 24px;
  break-inside: avoid;
}

.block h2 {
  margin: 0 0 12px;
  font-size: 20px;
  color: var(--color-brand-deep);
}

.column h3,
.qa-block h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--color-brand-deep);
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.simple-list {
  display: grid;
  gap: 8px;
}

.simple-item {
  font-size: 14px;
  line-height: 24px;
  color: var(--color-text);
}

.qa-block + .qa-block {
  margin-top: 16px;
}

@media print {
  .print-page {
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

  .block h2,
  .column h3,
  .qa-block h3 {
    color: #0f766e;
  }

  .simple-item {
    color: #334155;
  }
}
</style>
