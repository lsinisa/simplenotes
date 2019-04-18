<template>
  <div id="app">
      <note1 class="notes"/>
      <note2 class="notes"/>
      <note3 class="notes"/>
  </div>
</template>

<script>
import note1 from './components/note1'
import note2 from './components/note2'
import note3 from './components/note3'

export default {
  name: 'notes',
  components:{
    note1,note2,note3
  },
}

</script>

<style lang="scss">
*{
  background: #36454f;
  color: #fff;
}
</style>