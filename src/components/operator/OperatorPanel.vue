<template>
  <div class="operator-panel">
    <header class="header">
      <h1>Панель оператора</h1>
      <div class="user-info">
        <span>Оператор: {{ userEmail }}</span>
        <button @click="handleLogout" class="logout-btn">Выйти</button>
      </div>
    </header>

    <div class="main-content">
      <!-- Выбор станка -->
      <div class="machine-selector">
        <label>Выберите станок:</label>
        <select v-model="selectedMachine" @change="onMachineChange">
          <option value="">-- Выберите станок --</option>
          <option v-for="machine in machines" :key="machine.id" :value="machine.id">
            {{ machine.name }} ({{ machine.model }})
          </option>
        </select>
      </div>

      <!-- Панель управления -->
      <div v-if="selectedMachine" class="control-panel">
        <div class="status-display">
          <div class="current-status" :class="currentStatus">
            Текущий статус: {{ statusText }}
          </div>
          <div v-if="currentSession" class="session-timer">
            Длительность: {{ sessionDuration }}
          </div>
        </div>

        <div class="control-buttons">
          <button 
            @click="startWork" 
            :disabled="currentStatus === 'work'"
            class="btn-work"
          >
            🟢 Станок работает
          </button>
          
          <button 
            @click="showDowntimeReasons = true"
            :disabled="currentStatus === 'downtime'"
            class="btn-downtime"
          >
            🔴 Простой
          </button>
        </div>
      </div>

      <!-- Модальное окно выбора причины простоя -->
      <div v-if="showDowntimeReasons" class="modal-overlay">
        <div class="modal">
          <h3>Выберите причину простоя</h3>
          <div class="reasons-list">
            <button 
              v-for="reason in downtimeReasons" 
              :key="reason.id"
              @click="startDowntime(reason.id)"
              class="reason-btn"
            >
              {{ reason.name }}
            </button>
          </div>
          <button @click="showDowntimeReasons = false" class="btn-cancel">Отмена</button>
        </div>
      </div>

      <!-- История текущей смены -->
      <div v-if="currentSessions.length > 0" class="session-history">
        <h3>История смены</h3>
        <div class="sessions-list">
          <div 
            v-for="session in currentSessions" 
            :key="session.id"
            :class="['session-item', session.status]"
          >
            <span class="time">{{ formatTime(session.start_time) }}</span>
            <span class="status">{{ session.status === 'work' ? 'Работа' : 'Простой' }}</span>
            <span v-if="session.downtime_reason" class="reason">
              {{ getReasonName(session.downtime_reason_id) }}
            </span>
            <span class="duration">{{ calculateDuration(session.start_time, session.end_time) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../../services/supabase.js'

export default {
  name: 'OperatorPanel',
  data() {
    return {
      userEmail: '',
      selectedMachine: '',
      machines: [],
      downtimeReasons: [],
      currentStatus: 'inactive',
      currentSession: null,
      currentSessions: [],
      showDowntimeReasons: false,
      sessionTimer: null
    }
  },
  computed: {
    statusText() {
      switch (this.currentStatus) {
        case 'work': return 'РАБОТА'
        case 'downtime': return 'ПРОСТОЙ'
        default: return 'НЕ АКТИВЕН'
      }
    },
    sessionDuration() {
      if (!this.currentSession) return '00:00:00'
      const start = new Date(this.currentSession.start_time)
      const now = new Date()
      const diff = Math.floor((now - start) / 1000)
      
      const hours = Math.floor(diff / 3600).toString().padStart(2, '0')
      const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const seconds = (diff % 60).toString().padStart(2, '0')
      
      return `${hours}:${minutes}:${seconds}`
    }
  },
  async mounted() {
    await this.loadUserData()
    await this.loadMachines()
    await this.loadDowntimeReasons()
    this.startTimer()
  },
  beforeUnmount() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
    }
  },
  methods: {
    async loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      this.userEmail = user.email
    },
    
    async loadMachines() {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
      
      if (!error) this.machines = data
    },
    
    async loadDowntimeReasons() {
      const { data, error } = await supabase
        .from('downtime_reasons')
        .select('*')
        .eq('is_active', true)
      
      if (!error) this.downtimeReasons = data
    },
    
    async onMachineChange() {
      if (this.selectedMachine) {
        await this.loadCurrentSessions()
      }
    },
    
    async loadCurrentSessions() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('machine_id', this.selectedMachine)
        .gte('start_time', today.toISOString())
        .order('start_time', { ascending: true })
      
      if (!error) {
        this.currentSessions = data
        // Находим активную сессию (без end_time)
        this.currentSession = data.find(session => !session.end_time)
        this.currentStatus = this.currentSession ? this.currentSession.status : 'inactive'
      }
    },

    // Завершаем активную сессию для выбранного станка
    async completeActiveSession() {
      try {
        console.log('🔄 Завершаем активную сессию...')
        
        const { data: activeSessions, error } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('machine_id', this.selectedMachine)
          .is('end_time', null)

        if (error) {
          console.error('❌ Ошибка поиска активных сессий:', error)
          return
        }

        // Завершаем все найденные активные сессии
        if (activeSessions && activeSessions.length > 0) {
          for (const session of activeSessions) {
            const { error: updateError } = await supabase
              .from('work_sessions')
              .update({ 
                end_time: new Date().toISOString()
              })
              .eq('id', session.id)

            if (updateError) {
              console.error('❌ Ошибка завершения сессии:', updateError)
            } else {
              console.log('✅ Сессия завершена:', session.id)
            }
          }
        }
      } catch (error) {
        console.error('💥 Общая ошибка завершения сессии:', error)
      }
    },
    
    async startWork() {
      try {
        console.log('🚀 Переводим станок в работу...')
        
        // Завершаем предыдущую активную сессию
        await this.completeActiveSession()
        
        // Сразу меняем статус визуально
        this.currentStatus = 'work'
        
        // Создаем новую сессию работы
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
          .from('work_sessions')
          .insert([
            {
              machine_id: this.selectedMachine,
              operator_id: user.id,
              status: 'work',
              start_time: new Date().toISOString()
            }
          ])
          .select()

        console.log('📊 Результат записи работы:', data, error)
        
        if (error) {
          console.error('❌ Ошибка базы:', error)
          // В случае ошибки возвращаем предыдущий статус
          await this.loadCurrentSessions()
        } else {
          console.log('✅ Работа записана в базу! ID:', data[0]?.id)
          this.currentSession = data[0]
          await this.loadCurrentSessions()
        }
        
      } catch (error) {
        console.error('💥 Общая ошибка:', error)
        await this.loadCurrentSessions()
      }
    },

    async startDowntime(reasonId) {
      try {
        console.log('🛑 Переводим станок в простой...')
        
        // Завершаем предыдущую активную сессию
        await this.completeActiveSession()
        
        // Сразу меняем статус визуально
        this.currentStatus = 'downtime'
        this.showDowntimeReasons = false
        
        // Создаем новую сессию простоя
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
          .from('work_sessions')
          .insert([
            {
              machine_id: this.selectedMachine,
              operator_id: user.id,
              status: 'downtime',
              downtime_reason_id: reasonId,
              start_time: new Date().toISOString()
            }
          ])
          .select()

        console.log('📊 Результат записи простоя:', data, error)
        
        if (error) {
          console.error('❌ Ошибка базы:', error)
          // В случае ошибки возвращаем предыдущий статус
          await this.loadCurrentSessions()
        } else {
          console.log('✅ Простой записан в базу! ID:', data[0]?.id)
          this.currentSession = data[0]
          await this.loadCurrentSessions()
        }
        
      } catch (error) {
        console.error('💥 Общая ошибка:', error)
        await this.loadCurrentSessions()
      }
    },
    
    getReasonName(reasonId) {
      const reason = this.downtimeReasons.find(r => r.id === reasonId)
      return reason ? reason.name : ''
    },
    
    formatTime(dateString) {
      if (!dateString) return '--:--'
      try {
        return new Date(dateString).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } catch (e) {
        return '--:--'
      }
    },
    
    calculateDuration(start, end) {
      if (!start) return '--'
      
      const startTime = new Date(start)
      const endTime = end ? new Date(end) : new Date()
      
      // Если сессия ещё активна (нет end_time)
      if (!end) {
        const diff = Math.floor((endTime - startTime) / 1000 / 60) // в минутах
        return `активно (${diff} мин)`
      }
      
      const diff = Math.floor((endTime - startTime) / 1000 / 60)
      return `${diff} мин`
    },
    
    startTimer() {
      this.sessionTimer = setInterval(() => {
        // Таймер обновляет отображение длительности
        if (this.currentSession) {
          // Принудительно обновляем computed свойство
          this.$forceUpdate()
        }
      }, 1000)
    },
    
    async handleLogout() {
      await supabase.auth.signOut()
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
.operator-panel {
  padding: 20px;
  max-width: 800px;
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

.machine-selector {
  margin-bottom: 30px;
}

.machine-selector select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.control-panel {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.status-display {
  text-align: center;
  margin-bottom: 20px;
}

.current-status {
  font-size: 24px;
  font-weight: bold;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.current-status.work {
  background: #d4edda;
  color: #155724;
}

.current-status.downtime {
  background: #f8d7da;
  color: #721c24;
}

.current-status.inactive {
  background: #e2e3e5;
  color: #383d41;
}

.session-timer {
  font-size: 18px;
  color: #666;
}

.control-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.control-buttons button {
  padding: 15px 25px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.control-buttons button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-work {
  background: #28a745;
  color: white;
}

.btn-work:hover:not(:disabled) {
  background: #218838;
}

.btn-downtime {
  background: #dc3545;
  color: white;
}

.btn-downtime:hover:not(:disabled) {
  background: #c82333;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
}

.reasons-list {
  display: grid;
  gap: 10px;
  margin: 20px 0;
}

.reason-btn {
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.reason-btn:hover {
  background: #e9ecef;
}

.btn-cancel {
  padding: 10px 20px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.session-history {
  margin-top: 30px;
}

.sessions-list {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

.session-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.session-item:last-child {
  border-bottom: none;
}

.session-item.work {
  background: #f8fff9;
}

.session-item.downtime {
  background: #fff8f8;
}

.session-item .time {
  font-weight: bold;
}

.session-item .status.work {
  color: #28a745;
}

.session-item .status.downtime {
  color: #dc3545;
}

.session-item .reason {
  color: #666;
  font-style: italic;
}

.session-item .duration {
  color: #999;
}
</style>