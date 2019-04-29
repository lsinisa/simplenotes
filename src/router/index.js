import Vue from 'vue';
import Router from 'vue-router';
import Axios from 'axios';
import note from '../components/note';
import register from '../components/auth/register';
import login from '../components/auth/login';
import resource from '../components/resources/resources';

Vue.use(Router);

Vue.prototype.$http = Axios;
const token = localStorage.getItem('token');
if (token) {
  Vue.prototype.$http.defaults.headers.common.Authorisation = token;
}

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'note',
      component: note,
    },
    {
      path: '/register',
      name: 'register',
      component: register,
    },
    {
      path: '/login',
      name: 'login',
      component: login,
    },
    {
      path: '/resorce',
      name: 'resource',
      component: resource,
      meta: {
        requiresAuth: true,
      },
    },
  ],
});

export default router;
