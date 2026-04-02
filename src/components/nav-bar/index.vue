<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDarkModeStore } from '@/store/modules/dark-mode'

const darkModeStore = useDarkModeStore()
const { isDark } = storeToRefs(darkModeStore)
const route = useRoute()

const iconName = computed(() => isDark.value ? 'light' : 'dark')
const title = computed(() => String(route.meta.title || '卡赢考试助手'))

function onClickRight(event: TouchEvent | MouseEvent) {
  darkModeStore.toggleDarkMode(event)
}
</script>

<template>
  <van-nav-bar fixed placeholder :title="title" @click-right="onClickRight">
    <template #right>
      <svg-icon class="text-[18px]" :name="iconName" />
    </template>
  </van-nav-bar>
</template>

<style scoped></style>
