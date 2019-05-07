  <template>
  <div>
    <form class="login" @submit.prevent="login">
      <h1>login</h1>
      <input required v-model="email" type="email" placeholder="email"><br>
      <input required v-model="password" type="password" placeholder="password"><br>
      <button type="submit">login</button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      password: '',
    };
  },
  methods: {
    login() {
      const email = this.email;
      const password = this.password;
      this.$store
        .dispatch('login', { email, password })
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
font-size: 1em;
border: 2px solid;
border-radius: .3em;
margin: .2em 0;
}

button:hover{
  cursor: pointer;
  background: #000;
  color: #fff;
}
</style>
