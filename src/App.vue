<template>
  <div id="app">
    <h1>Welcome to simpleNotes</h1>
      <note0 class="notes"/>
      <note1 class="notes"/>
      <note2 class="notes"/>
  </div>
</template>

<script>
import note0 from './components/note0'
import note1 from './components/note1'
import note2 from './components/note2'

export default {
  name: 'notes',
  components:{
    note0,note1,note2
  },
}

</script>

<style lang="scss">
*{
  background: #36454f;
  color: #fff;
}
  .notes{
    display: inline-block;
    width: 33%;
  }
</style>