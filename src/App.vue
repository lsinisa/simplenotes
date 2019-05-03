<template>
  <div id="app">
    <img src="./assets/logo.png">
    <div id="nav">
      <span v-if="isLoggedIn">
        <a class="logout" @click="logout">Logout</a>
      </span>
      <span v-else>
        <router-link to="/">Register</router-link> |
        <router-link to="/login">Login</router-link>
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
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  box-sizing: border-box;
  max-width: 600px;
  margin: 0 auto;
}

img{
  float: initial;
  width: 25%;
  margin: auto;
}

.logout{
float: right;
}

.nav{
  margin: auto;
}

#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

a:hover {
  cursor: pointer;
}
</style>
