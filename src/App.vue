<template>
  <div id="app">
    <img src="./assets/logo.png">
    <div id="nav">
      <span v-if="isLoggedIn">
        <button class="logout" @click="logout">logout</button>
      </span>
      <span v-else>
        <router-link class="link" to="/">register</router-link>
        <router-link class="link" to="/login">login</router-link>
      </span>
    </div>
    <router-view/>
  </div>
</template>

<script>
export default {
  computed: {
    isLoggedIn() {
      return this.$store.getters.isLoggedIn;
    },
  },
  methods: {
    logout() {
      this.$store.dispatch('logout').then(() => {
        this.$router.push('/login');
      });
    },
  },
};
</script>

<style>
* {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  color: #2c3e50;
  background: #F5F5F5;
}

#app{
  padding: 1em 1em 1em 0;
}

.link{
  text-decoration: none;
  font-size: 1em;
  border: 2px solid;
  border-radius: .3em;
  padding: .2em;
}

  .link:hover{
    cursor: pointer;
    background: #000;
    color: #fff;
  }

img{
  float: right;
  width: 3em;
}

a:hover {
  cursor: pointer;
}
</style>
