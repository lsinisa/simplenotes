<template>
  <div id="app">
    <h1>Welcome to Your Vue.js App</h1>
    <note></note>
  </div>
</template>

<script>
import note from './components/note'

export default {
  name: 'notes',
  components:{
    note
  }
}
</script>

<style>

</style>