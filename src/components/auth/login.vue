  <template>
  <div>
    <form class="login" @submit.prevent="login">
      <h3>login</h3>
      <label>e-mail</label>
      <input required v-model="email" type="email" placeholder="Name"><br>
      <label>password</label>
      <input required v-model="password" type="password" placeholder="Password">
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
        .then(() => this.$router.push('/note'))
        .catch(err => console.log(err));
    },
  },
};
</script>
