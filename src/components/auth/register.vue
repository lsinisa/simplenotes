
<template>
  <div>
    <h1>register</h1>
    <form @submit.prevent="register">
        <input id="name" type="text" v-model="name" required autofocus placeholder="name"> <br>
        <input id="email" type="email" v-model="email" required placeholder="e-mail"> <br>
        <input id="password" type="password" v-model="password" required placeholder="password">
        <br>
        <input
        id="password-confirm" type="password"
        v-model="password_confirmation" required
        placeholder="confirm password">
      <div>
        <button type="submit">register</button>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    };
  },
  methods: {
    register() {
      const data = {
        name: this.name,
        email: this.email,
        password: this.password,
      };
      this.$store
        .dispatch('register', data)
        .then(() => this.$router.push('/note')) // eslint-disable-next-line
        .catch(err => console.log(err));
    },
  },
};
</script>

<style lang="scss">
input {
  font-size: 1em;
  border: 2px solid;
  border-radius: .3em;
  margin: .2em 0;
  }

  button{
  margin: 8px 0;
  font-size: 1em;
  border: 2px solid;
  border-radius: .3em;
  }

  button:hover{
    cursor: pointer;
    background: #000;
    color: #fff;
  }
</style>
