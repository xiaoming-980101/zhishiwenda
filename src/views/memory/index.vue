<script setup lang="ts">
import { mustKnowItems, noticeCards, platformCards, productCards, scenarioCards, shortAnswerNotes } from '@/data/exam'

defineOptions({
  name: 'Memory',
})

const activeTab = ref(0)
</script>

<template>
  <div class="px-[12px] pt-[12px] pb-[90px]">
    <section class="memory-banner rounded-[20px] p-[16px] text-white">
      <div class="text-[12px] tracking-[2px] uppercase opacity-80">
        Key Notes
      </div>
      <div class="text-[24px] font-bold mt-[8px]">
        速记卡片
      </div>
      <p class="text-[14px] leading-[24px] mt-[8px] text-white/85">
        先把知识骨架背熟，再做场景题，效率会高很多。这里按平台、产品、典型案例和简答题参考答案整理好了。
      </p>
      <div class="mt-[14px]">
        <router-link class="print-link" :to="{ name: 'PrintPack' }">
          打开打印版速记页
        </router-link>
      </div>
    </section>

    <van-tabs v-model:active="activeTab" animated sticky offset-top="46">
      <van-tab title="通知">
        <div class="mt-[14px] space-y-[12px]">
          <div
            v-for="item in noticeCards"
            :key="item.title"
            class="memory-card"
          >
            <div class="card-chip">
              {{ item.title }}
            </div>
            <div class="text-[15px] leading-[26px] mt-[12px]">
              {{ item.content }}
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="必背">
        <div class="mt-[14px] space-y-[12px]">
          <div
            v-for="item in mustKnowItems"
            :key="item.id"
            class="memory-card"
          >
            <div class="card-chip">
              高频 {{ item.id }}
            </div>
            <div class="text-[18px] font-bold text-[var(--color-brand-deep)] leading-[28px] mt-[12px]">
              {{ item.title }}
            </div>
            <div class="tip-box mt-[12px]">
              {{ item.answer }}
            </div>
            <div class="text-[13px] leading-[22px] text-[var(--van-text-color-2)] mt-[10px]">
              依据：{{ item.proof }}
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="平台">
        <div class="mt-[14px] space-y-[12px]">
          <div
            v-for="item in platformCards"
            :key="item.name"
            class="memory-card"
          >
            <div class="card-chip">
              {{ item.name }}
            </div>
            <div class="text-[20px] font-bold mt-[12px] text-[var(--color-brand-deep)]">
              {{ item.fullName }}
            </div>
            <div class="text-[14px] leading-[24px] mt-[8px]">
              {{ item.role }}
            </div>
            <div class="tip-box mt-[12px]">
              {{ item.quickNote }}
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="产品">
        <div class="mt-[14px] space-y-[12px]">
          <div
            v-for="item in productCards"
            :key="item.name"
            class="memory-card"
          >
            <div class="flex items-start justify-between gap-[10px]">
              <div>
                <div class="text-[20px] font-bold text-[var(--color-brand-deep)]">
                  {{ item.name }}
                </div>
                <div class="text-[13px] text-[var(--van-text-color-2)] mt-[4px]">
                  {{ item.scope }}
                </div>
              </div>
              <van-tag type="primary" plain>
                {{ item.platform }}
              </van-tag>
            </div>
            <div class="info-row">
              <span>适用场景</span>
              <span>{{ item.scene }}</span>
            </div>
            <div class="info-row">
              <span>合同建议</span>
              <span>{{ item.contract }}</span>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="案例">
        <div class="mt-[14px] space-y-[12px]">
          <div
            v-for="item in scenarioCards"
            :key="item.title"
            class="memory-card"
          >
            <div class="card-chip">
              {{ item.title }}
            </div>
            <div class="text-[15px] leading-[26px] mt-[12px]">
              {{ item.description }}
            </div>
            <div class="tip-box mt-[12px]">
              {{ item.result }}
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="简答">
        <div class="mt-[14px] space-y-[12px]">
          <div
            v-for="item in shortAnswerNotes"
            :key="item.question"
            class="memory-card"
          >
            <div class="text-[18px] font-bold text-[var(--color-brand-deep)] leading-[28px]">
              {{ item.question }}
            </div>
            <div class="tip-box mt-[12px]">
              {{ item.answer }}
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped lang="less">
.memory-banner {
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.32), transparent 26%),
    linear-gradient(135deg, #312e81, #1d4ed8 48%, #0ea5e9);
  box-shadow: 0 18px 40px rgba(29, 78, 216, 0.18);
}

.memory-card {
  background: var(--color-block-background);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.print-link {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.card-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  font-size: 12px;
  font-weight: 700;
}

.tip-box {
  border-radius: 16px;
  padding: 12px;
  background: var(--color-soft-card);
  font-size: 14px;
  line-height: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 14px;
  line-height: 24px;
}

.info-row span:first-child {
  color: var(--van-text-color-2);
  flex-shrink: 0;
}

.info-row span:last-child {
  text-align: right;
}
</style>
