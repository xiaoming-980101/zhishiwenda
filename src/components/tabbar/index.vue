<script setup lang="ts">
const tabbarData = reactive([
  {
    icon: 'home-o',
    title: '总览',
    to: {
      name: 'Home',
    },
  },
  {
    icon: 'edit',
    title: '答题',
    to: {
      name: 'Practice',
    },
  },
  {
    icon: 'bookmark-o',
    title: '速记',
    to: {
      name: 'Memory',
    },
  },
])
</script>

<template>
  <van-tabbar :placeholder="true" :route="true" fixed>
    <van-tabbar-item
      v-for="(item, index) in tabbarData"
      :key="index"
      :icon="item.icon"
      :to="item.to"
    >
      {{ item.title }}
    </van-tabbar-item>
  </van-tabbar>
</template>
