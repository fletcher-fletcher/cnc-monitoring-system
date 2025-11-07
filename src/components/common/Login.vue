<template>
  <div class="login-container">
    <h2>Вход в систему учёта ЧПУ станков</h2>
    
    <div class="auth-form">
      <h3>Вход</h3>
      <input v-model="email" type="email" placeholder="Email">
      <input v-model="password" type="password" placeholder="Пароль">
      <button @click="handleSignIn">Войти</button>
    </div>

    <div v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </div>
  </div>
</template>

<script>
import { supabase } from '@/services/supabase'

export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
      message: '',
      isError: false
    }
  },
  methods: {
    async handleSignIn() {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: this.email,
          password: this.password,
        })
        
        if (error) throw error
        
        // Получаем профиль пользователя чтобы узнать роль
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        if (profileError) throw profileError
        
        // Перенаправляем в зависимости от роли
        if (profile.role === 'admin') {
          this.$router.push('/admin')
        } else {
          this.$router.push('/operator')
        }
        
        this.message = 'Вход успешен!'
        this.isError = false
      } catch (error) {
        this.message = error.message
        this.isError = true
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  text-align: center;
}

.auth-form {
  margin: 20px 0;
}

input {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 10px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #369c70;
}

.message {
  margin: 10px 0;
  padding: 10px;
  border-radius: 4px;
}

.error {
  background: #ffebee;
  color: #c62828;
}
</style>