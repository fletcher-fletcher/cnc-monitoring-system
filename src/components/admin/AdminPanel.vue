<template>
  <div class="admin-panel">
    <header class="header">
      <h1>Панель администратора</h1>
      <div class="user-info">
        <span>Администратор: {{ userEmail }}</span>
        <button @click="handleLogout" class="logout-btn">Выйти</button>
      </div>
    </header>

    <div class="admin-nav">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="currentTab = tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
      >
        {{ tab.name }}
      </button>
    </div>

    <div class="tab-content">
      <!-- Дашборд -->
      <div v-if="currentTab === 'dashboard'" class="dashboard-tab">
        <h2>Общая статистика</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Всего станков</h3>
            <div class="stat-number">{{ machines.length }}</div>
          </div>
          <div class="stat-card">
            <h3>Операторов</h3>
            <div class="stat-number">{{ operatorsCount }}</div>
          </div>
          <div class="stat-card">
            <h3>Активных сессий</h3>
            <div class="stat-number">{{ activeSessions.length }}</div>
          </div>
        </div>

        <div class="recent-activity">
          <h3>Последние действия</h3>
          <div v-if="recentSessions.length === 0" class="no-data">Нет данных</div>
          <div v-else class="sessions-list">
            <div v-for="session in recentSessions" :key="session.id" class="session-item">
              <span class="time">{{ formatTime(session.start_time) }}</span>
              <span class="machine">{{ getMachineName(session.machine_id) }}</span>
              <span :class="['status', session.status]">
                {{ session.status === 'work' ? 'Работа' : 'Простой' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Управление пользователями -->
      <div v-if="currentTab === 'users'" class="users-tab">
        <h2>Управление пользователями</h2>
        
        <div class="add-user-form">
          <h3>Добавить пользователя</h3>
          <div class="form-row">
            <input v-model="newUser.email" placeholder="Email" type="email">
            <input v-model="newUser.password" placeholder="Пароль" type="password">
            <input v-model="newUser.full_name" placeholder="ФИО">
            <select v-model="newUser.role">
              <option value="operator">Оператор</option>
              <option value="admin">Администратор</option>
            </select>
            <button @click="addUser" class="btn-primary">Добавить</button>
          </div>
        </div>

        <div class="users-list">
          <h3>Список пользователей</h3>
          <div v-if="users.length === 0" class="no-data">Нет пользователей</div>
          <table v-else class="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>ФИО</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.email }}</td>
                <td>
                  <input 
                    :value="user.full_name" 
                    @input="user.editable_full_name = $event.target.value"
                    @blur="updateUserField(user.id, 'full_name', user.editable_full_name || user.full_name)"
                    class="editable-field"
                  >
                </td>
                <td>
                  <select 
                    :value="user.role" 
                    @change="updateUserField(user.id, 'role', $event.target.value)"
                    :disabled="user.id === currentUserId"
                  >
                    <option value="operator">Оператор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>
                  <span :class="['status-badge', user.is_active ? 'active' : 'inactive']">
                    {{ user.is_active ? 'Активен' : 'Неактивен' }}
                  </span>
                </td>
                <td>
                  <button 
                    @click="toggleUserStatus(user.id, !user.is_active)"
                    :disabled="user.id === currentUserId"
                    class="btn-small"
                  >
                    {{ user.is_active ? 'Деактивировать' : 'Активировать' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Управление станками -->
      <div v-if="currentTab === 'machines'" class="machines-tab">
        <h2>Управление станками</h2>
        
        <div class="add-machine-form">
          <h3>Добавить станок</h3>
          <div class="form-row">
            <input v-model="newMachine.name" placeholder="Название станка">
            <input v-model="newMachine.model" placeholder="Модель">
            <button @click="addMachine" class="btn-primary">Добавить</button>
          </div>
        </div>

        <div class="machines-list">
          <h3>Список станков</h3>
          <div v-if="machines.length === 0" class="no-data">Нет станков</div>
          <table v-else class="machines-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Модель</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="machine in machines" :key="machine.id">
                <td>
                  <input 
                    :value="machine.name" 
                    @input="machine.editable_name = $event.target.value"
                    @blur="updateMachineField(machine.id, 'name', machine.editable_name || machine.name)"
                    class="editable-field"
                  >
                </td>
                <td>
                  <input 
                    :value="machine.model" 
                    @input="machine.editable_model = $event.target.value"
                    @blur="updateMachineField(machine.id, 'model', machine.editable_model || machine.model)"
                    class="editable-field"
                  >
                </td>
                <td>
                  <span :class="['status-badge', machine.is_active ? 'active' : 'inactive']">
                    {{ machine.is_active ? 'Активен' : 'Неактивен' }}
                  </span>
                </td>
                <td>
                  <button 
                    @click="toggleMachineStatus(machine.id, !machine.is_active)"
                    class="btn-small"
                  >
                    {{ machine.is_active ? 'Архивировать' : 'Активировать' }}
                  </button>
                  <button 
                    @click="deleteMachine(machine.id)"
                    class="btn-small btn-danger"
                    style="margin-left: 5px;"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Управление причинами простоя -->
      <div v-if="currentTab === 'reasons'" class="reasons-tab">
        <h2>Управление причины простоя</h2>
        
        <div class="add-reason-form">
          <h3>Добавить причину</h3>
          <div class="form-row">
            <input v-model="newReason.name" placeholder="Название причины">
            <select v-model="newReason.category">
              <option value="planned">Плановый</option>
              <option value="unplanned">Неплановый</option>
              <option value="organizational">Организационный</option>
            </select>
            <button @click="addReason" class="btn-primary">Добавить</button>
          </div>
        </div>

        <div class="reasons-list">
          <h3>Список причин</h3>
          <div v-if="downtimeReasons.length === 0" class="no-data">Нет причин простоя</div>
          <table v-else class="reasons-table">
            <thead>
              <tr>
                <th>Причина</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reason in downtimeReasons" :key="reason.id">
                <td>
                  <input 
                    :value="reason.name" 
                    @input="reason.editable_name = $event.target.value"
                    @blur="updateReasonField(reason.id, 'name', reason.editable_name || reason.name)"
                    class="editable-field"
                  >
                </td>
                <td>
                  <select 
                    :value="reason.category" 
                    @change="updateReasonField(reason.id, 'category', $event.target.value)"
                  >
                    <option value="planned">Плановый</option>
                    <option value="unplanned">Неплановый</option>
                    <option value="organizational">Организационный</option>
                  </select>
                </td>
                <td>
                  <span :class="['status-badge', reason.is_active ? 'active' : 'inactive']">
                    {{ reason.is_active ? 'Активна' : 'Неактивна' }}
                  </span>
                </td>
                <td>
                  <button 
                    @click="toggleReasonStatus(reason.id, !reason.is_active)"
                    class="btn-small"
                  >
                    {{ reason.is_active ? 'Деактивировать' : 'Активировать' }}
                  </button>
                  <button 
                    @click="deleteReason(reason.id)"
                    class="btn-small btn-danger"
                    style="margin-left: 5px;"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Отчёты и аналитика -->
      <div v-if="currentTab === 'reports'" class="reports-tab">
        <ReportsPanel />
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../../services/supabase.js'
import ReportsPanel from './ReportsPanel.vue'

export default {
  name: 'AdminPanel',
  components: {
    ReportsPanel
  },
  data() {
    return {
      userEmail: '',
      currentUserId: '',
      currentTab: 'dashboard',
      tabs: [
        { id: 'dashboard', name: 'Дашборд' },
        { id: 'users', name: 'Пользователи' },
        { id: 'machines', name: 'Станки' },
        { id: 'reasons', name: 'Причины простоя' },
        { id: 'reports', name: 'Отчёты' }
      ],
      users: [],
      machines: [],
      downtimeReasons: [],
      activeSessions: [],
      recentSessions: [],
      newUser: {
        email: '',
        password: '',
        full_name: '',
        role: 'operator'
      },
      newMachine: {
        name: '',
        model: ''
      },
      newReason: {
        name: '',
        category: 'unplanned'
      }
    }
  },
  computed: {
    operatorsCount() {
      return this.users.filter(user => user.role === 'operator').length
    }
  },
  async mounted() {
    await this.loadUserData()
    await this.loadAllData()
  },
  methods: {
    async loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      this.userEmail = user.email
      this.currentUserId = user.id
    },

    async loadAllData() {
      await Promise.all([
        this.loadUsers(),
        this.loadMachines(),
        this.loadDowntimeReasons(),
        this.loadActiveSessions(),
        this.loadRecentSessions()
      ])
    },

    async loadUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error) this.users = data
    },

    async loadMachines() {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error) this.machines = data
    },

    async loadDowntimeReasons() {
      const { data, error } = await supabase
        .from('downtime_reasons')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error) this.downtimeReasons = data
    },

    async loadActiveSessions() {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .is('end_time', null)
      
      if (!error) this.activeSessions = data
    },

    async loadRecentSessions() {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error) this.recentSessions = data
    },

    async addUser() {
      if (!this.newUser.email || !this.newUser.password) {
        alert('Заполните email и пароль')
        return
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: this.newUser.email,
          password: this.newUser.password,
        })

        if (authError) throw authError

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              email: this.newUser.email,
              full_name: this.newUser.full_name,
              role: this.newUser.role
            }])

          if (profileError) throw profileError
        }

        this.newUser = { email: '', password: '', full_name: '', role: 'operator' }
        await this.loadUsers()
        alert('Пользователь создан успешно!')

      } catch (error) {
        console.error('Ошибка создания пользователя:', error)
        alert('Ошибка: ' + error.message)
      }
    },

    async updateUserField(userId, field, value) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ [field]: value })
          .eq('id', userId)

        if (error) throw error
        await this.loadUsers()
      } catch (error) {
        console.error('Ошибка обновления пользователя:', error)
        alert('Ошибка обновления')
      }
    },

    async toggleUserStatus(userId, isActive) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

      if (error) {
        console.error('Ошибка изменения статуса:', error)
        alert('Ошибка изменения статуса')
      } else {
        await this.loadUsers()
      }
    },

    async addMachine() {
      if (!this.newMachine.name) {
        alert('Введите название станка')
        return
      }

      const { error } = await supabase
        .from('machines')
        .insert([this.newMachine])

      if (error) {
        console.error('Ошибка добавления станка:', error)
        alert('Ошибка добавления станка')
      } else {
        this.newMachine = { name: '', model: '' }
        await this.loadMachines()
      }
    },

    async updateMachineField(machineId, field, value) {
      try {
        const { error } = await supabase
          .from('machines')
          .update({ [field]: value })
          .eq('id', machineId)

        if (error) throw error
        await this.loadMachines()
      } catch (error) {
        console.error('Ошибка обновления станка:', error)
        alert('Ошибка обновления')
      }
    },

    async toggleMachineStatus(machineId, isActive) {
      const { error } = await supabase
        .from('machines')
        .update({ is_active: isActive })
        .eq('id', machineId)

      if (error) {
        console.error('Ошибка изменения статуса станка:', error)
      } else {
        await this.loadMachines()
      }
    },

    async deleteMachine(machineId) {
      if (confirm('Удалить этот станок?')) {
        const { error } = await supabase
          .from('machines')
          .delete()
          .eq('id', machineId)
        
        if (error) {
          console.error('Ошибка удаления станка:', error)
          alert('Ошибка удаления')
        } else {
          await this.loadMachines()
        }
      }
    },

    async addReason() {
      if (!this.newReason.name) {
        alert('Введите название причины')
        return
      }

      const { error } = await supabase
        .from('downtime_reasons')
        .insert([this.newReason])

      if (error) {
        console.error('Ошибка добавления причины:', error)
        alert('Ошибка добавления причины')
      } else {
        this.newReason = { name: '', category: 'unplanned' }
        await this.loadDowntimeReasons()
      }
    },

    async updateReasonField(reasonId, field, value) {
      try {
        const { error } = await supabase
          .from('downtime_reasons')
          .update({ [field]: value })
          .eq('id', reasonId)

        if (error) throw error
        await this.loadDowntimeReasons()
      } catch (error) {
        console.error('Ошибка обновления причины:', error)
        alert('Ошибка обновления')
      }
    },

    async toggleReasonStatus(reasonId, isActive) {
      const { error } = await supabase
        .from('downtime_reasons')
        .update({ is_active: isActive })
        .eq('id', reasonId)

      if (error) {
        console.error('Ошибка изменения статуса причины:', error)
      } else {
        await this.loadDowntimeReasons()
      }
    },

    async deleteReason(reasonId) {
      if (confirm('Удалить эту причину?')) {
        const { error } = await supabase
          .from('downtime_reasons')
          .delete()
          .eq('id', reasonId)
        
        if (error) {
          console.error('Ошибка удаления причины:', error)
          alert('Ошибка удаления')
        } else {
          await this.loadDowntimeReasons()
        }
      }
    },

    getCategoryName(category) {
      const names = {
        planned: 'Плановый',
        unplanned: 'Неплановый',
        organizational: 'Организационный'
      }
      return names[category] || category
    },

    getMachineName(machineId) {
      const machine = this.machines.find(m => m.id === machineId)
      return machine ? machine.name : 'Неизвестно'
    },

    formatTime(dateString) {
      return new Date(dateString).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    async handleLogout() {
      await supabase.auth.signOut()
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
.admin-panel {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eee;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-btn {
  padding: 8px 16px;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.admin-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 1px solid #ddd;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
}

.tab-btn.active {
  border-bottom-color: #42b883;
  color: #42b883;
  font-weight: bold;
}

.tab-content {
  min-height: 400px;
}

/* Статистика */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border-left: 4px solid #42b883;
}

.stat-number {
  font-size: 2em;
  font-weight: bold;
  color: #42b883;
}

/* Формы */
.add-user-form,
.add-machine-form,
.add-reason-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
}

.form-row input,
.form-row select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.btn-primary {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-small {
  padding: 4px 8px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.btn-danger {
  background: #dc3545;
}

/* Таблицы */
.users-table,
.machines-table,
.reasons-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.users-table th,
.machines-table th,
.reasons-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

.users-table td,
.machines-table td,
.reasons-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

/* Редактируемые поля */
.editable-field {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  width: 100%;
  background: white;
}

.editable-field:focus {
  border-color: #42b883;
  outline: none;
}

/* Статусы */
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.category-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.category-badge.planned {
  background: #d1ecf1;
  color: #0c5460;
}

.category-badge.unplanned {
  background: #fff3cd;
  color: #856404;
}

.category-badge.organizational {
  background: #e2e3e5;
  color: #383d41;
}

/* Активность */
.recent-activity {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.session-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.session-item:last-child {
  border-bottom: none;
}

.session-item .status.work {
  color: #28a745;
  font-weight: 500;
}

.session-item .status.downtime {
  color: #dc3545;
  font-weight: 500;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #6c757d;
  font-style: italic;
}
</style>