<template>
  <div id="app">
    <h1>Welcome to simpleNotes</h1>
      <note0/>
      <note1/>
      <note2/>
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
  div{
    display: inline-block;
    width: 50%;
  }
</style>