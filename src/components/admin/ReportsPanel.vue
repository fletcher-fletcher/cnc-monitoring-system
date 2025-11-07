<template>
  <div class="reports-panel">
    <h2>📊 Система отчётов и аналитики</h2>
    
    <!-- Фильтры -->
    <div class="filters">
      <div class="filter-group">
        <label>Период:</label>
        <select v-model="filters.period" @change="loadReports">
          <option value="today">Сегодня</option>
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Станок:</label>
        <select v-model="filters.machineId" @change="loadReports">
          <option value="">Все станки</option>
          <option v-for="machine in machines" :key="machine.id" :value="machine.id">
            {{ machine.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Ключевые метрики -->
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Общее время работы</h3>
        <div class="metric-value">{{ formatDuration(metrics.totalWorkTime) }}</div>
        <div class="metric-label">{{ Math.round(metrics.utilization) }}% использования</div>
      </div>
      
      <div class="metric-card">
        <h3>Общее время простоя</h3>
        <div class="metric-value">{{ formatDuration(metrics.totalDowntime) }}</div>
        <div class="metric-label">{{ Math.round(100 - metrics.utilization) }}% простоев</div>
      </div>
      
      <div class="metric-card">
        <h3>Коэффициент использования</h3>
        <div class="metric-value">{{ Math.round(metrics.utilization) }}%</div>
        <div class="metric-label">Efficiency</div>
      </div>
      
      <div class="metric-card">
        <h3>Количество сессий</h3>
        <div class="metric-value">{{ metrics.totalSessions }}</div>
        <div class="metric-label">работа: {{ metrics.workSessions }}, простой: {{ metrics.downtimeSessions }}</div>
      </div>
    </div>

    <!-- Простои по причинам -->
    <div class="reasons-breakdown">
      <h3>📈 Простои по причинам</h3>
      <div v-if="downtimeByReason.length === 0" class="no-data">Нет данных о простоях</div>
      <div v-else class="reasons-list">
        <div v-for="item in downtimeByReason" :key="item.reason" class="reason-item">
          <span class="reason-name">{{ item.reason }}</span>
          <span class="reason-time">{{ formatDuration(item.duration) }}</span>
          <div class="reason-bar">
            <div 
              class="reason-progress" 
              :style="{ width: item.percentage + '%' }"
            ></div>
          </div>
          <span class="reason-percentage">{{ Math.round(item.percentage) }}%</span>
        </div>
      </div>
    </div>

    <!-- Детальная таблица -->
    <div class="detailed-report">
      <h3>📋 Детальный отчёт</h3>
      <div class="report-actions">
        <button @click="exportToCSV" class="btn-primary">📥 Экспорт в CSV</button>
      </div>
      
      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Станок</th>
              <th>Статус</th>
              <th>Причина</th>
              <th>Начало</th>
              <th>Конец</th>
              <th>Длительность</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in reportSessions" :key="session.id">
              <td>{{ formatDate(session.start_time) }}</td>
              <td>{{ getMachineName(session.machine_id) }}</td>
              <td :class="session.status">
                {{ session.status === 'work' ? '🟢 Работа' : '🔴 Простой' }}
              </td>
              <td>{{ getReasonName(session.downtime_reason_id) }}</td>
              <td>{{ formatTime(session.start_time) }}</td>
              <td>{{ session.end_time ? formatTime(session.end_time) : 'активно' }}</td>
              <td>{{ calculateDuration(session.start_time, session.end_time) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="reportSessions.length === 0" class="no-data">
        📊 Нет данных для отображения
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../../services/supabase.js'

export default {
  name: 'ReportsPanel',
  data() {
    return {
      filters: {
        period: 'week',
        machineId: ''
      },
      metrics: {
        totalWorkTime: 0,
        totalDowntime: 0,
        utilization: 0,
        totalSessions: 0,
        workSessions: 0,
        downtimeSessions: 0
      },
      reportSessions: [],
      machines: [],
      downtimeReasons: [],
      downtimeByReason: []
    }
  },
  async mounted() {
    await this.loadReferenceData()
    await this.loadReports()
  },
  methods: {
    async loadReferenceData() {
      // Загружаем справочники
      const [machinesRes, reasonsRes] = await Promise.all([
        supabase.from('machines').select('*'),
        supabase.from('downtime_reasons').select('*')
      ])
      
      this.machines = machinesRes.data || []
      this.downtimeReasons = reasonsRes.data || []
    },

    async loadReports() {
      const dateRange = this.getDateRange()
      
      console.log('Загружаем отчёты за период:', dateRange)
      
      // Загружаем сессии за выбранный период
      let query = supabase
        .from('work_sessions')
        .select('*')
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end)
        .order('start_time', { ascending: false })

      if (this.filters.machineId) {
        query = query.eq('machine_id', this.filters.machineId)
      }

      const { data: sessions, error } = await query

      if (error) {
        console.error('Ошибка загрузки сессий:', error)
        return
      }

      this.reportSessions = sessions || []
      this.calculateMetrics(sessions || [])
      this.calculateDowntimeByReason(sessions || [])
    },

    getDateRange() {
      const now = new Date()
      const start = new Date()
      
      switch (this.filters.period) {
        case 'today':
          start.setHours(0, 0, 0, 0)
          break
        case 'week':
          start.setDate(now.getDate() - 7)
          break
        case 'month':
          start.setMonth(now.getMonth() - 1)
          break
      }

      return {
        start: start.toISOString(),
        end: now.toISOString()
      }
    },

    calculateMetrics(sessions) {
      let totalWorkTime = 0
      let totalDowntime = 0
      let workSessions = 0
      let downtimeSessions = 0

      sessions.forEach(session => {
        const start = new Date(session.start_time)
        const end = session.end_time ? new Date(session.end_time) : new Date()
        const duration = (end - start) / 1000 / 60 / 60 // в часах

        if (session.status === 'work') {
          totalWorkTime += duration
          workSessions++
        } else {
          totalDowntime += duration
          downtimeSessions++
        }
      })

      const totalTime = totalWorkTime + totalDowntime
      const utilization = totalTime > 0 ? (totalWorkTime / totalTime) * 100 : 0

      this.metrics = {
        totalWorkTime,
        totalDowntime,
        utilization,
        totalSessions: sessions.length,
        workSessions,
        downtimeSessions
      }
    },

    calculateDowntimeByReason(sessions) {
      const reasonsMap = {}
      let totalDowntime = 0

      // Считаем время простоя по причинам
      sessions
        .filter(s => s.status === 'downtime' && s.downtime_reason_id)
        .forEach(session => {
          const start = new Date(session.start_time)
          const end = session.end_time ? new Date(session.end_time) : new Date()
          const duration = (end - start) / 1000 / 60 / 60 // в часах
          
          const reasonName = this.getReasonName(session.downtime_reason_id)
          reasonsMap[reasonName] = (reasonsMap[reasonName] || 0) + duration
          totalDowntime += duration
        })

      // Преобразуем в массив для отображения
      this.downtimeByReason = Object.entries(reasonsMap).map(([reason, duration]) => ({
        reason,
        duration,
        percentage: totalDowntime > 0 ? (duration / totalDowntime) * 100 : 0
      })).sort((a, b) => b.duration - a.duration)
    },

    getMachineName(machineId) {
      const machine = this.machines.find(m => m.id === machineId)
      return machine ? machine.name : 'Неизвестно'
    },

    getReasonName(reasonId) {
      const reason = this.downtimeReasons.find(r => r.id === reasonId)
      return reason ? reason.name : 'Не указана'
    },

    formatTime(timestamp) {
      if (!timestamp) return '--:--'
      try {
        return new Date(timestamp).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (e) {
        return '--:--'
      }
    },

    formatDate(timestamp) {
      if (!timestamp) return '--.--.----'
      try {
        return new Date(timestamp).toLocaleDateString('ru-RU')
      } catch (e) {
        return '--.--.----'
      }
    },

    formatDuration(hours) {
      if (isNaN(hours) || hours === 0) return '0ч 0м'
      const totalMinutes = Math.round(hours * 60)
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return `${h}ч ${m}м`
    },

    calculateDuration(start, end) {
      if (!start) return '--'
      
      try {
        const startTime = new Date(start)
        const endTime = end ? new Date(end) : new Date()
        
        // Если сессия ещё активна (нет end_time)
        if (!end) {
          const diff = Math.floor((endTime - startTime) / 1000 / 60) // в минутах
          return `активно (${diff} мин)`
        }
        
        const diff = Math.floor((endTime - startTime) / 1000 / 60)
        return `${diff} мин`
      } catch (e) {
        return '--'
      }
    },

    exportToCSV() {
      const headers = ['Дата', 'Станок', 'Статус', 'Причина', 'Начало', 'Конец', 'Длительность']
      const csvData = this.reportSessions.map(session => [
        this.formatDate(session.start_time),
        this.getMachineName(session.machine_id),
        session.status === 'work' ? 'Работа' : 'Простой',
        this.getReasonName(session.downtime_reason_id),
        this.formatTime(session.start_time),
        session.end_time ? this.formatTime(session.end_time) : 'активно',
        this.calculateDuration(session.start_time, session.end_time)
      ])

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `отчет_станков_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.reports-panel {
  padding: 20px;
}

.filters {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
  border-left: 4px solid #42b883;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #42b883;
  margin: 10px 0;
}

.metric-label {
  color: #6c757d;
  font-size: 0.9em;
}

.reasons-breakdown {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.reason-item:last-child {
  border-bottom: none;
}

.reason-name {
  flex: 1;
  font-weight: 500;
}

.reason-time {
  width: 80px;
  text-align: right;
  color: #6c757d;
}

.reason-bar {
  flex: 2;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.reason-progress {
  height: 100%;
  background: #ffc107;
  transition: width 0.3s ease;
}

.reason-percentage {
  width: 50px;
  text-align: right;
  font-weight: 500;
  color: #495057;
}

.detailed-report {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.report-actions {
  margin-bottom: 20px;
}

.btn-primary {
  padding: 10px 20px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.report-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.report-table .work {
  color: #28a745;
  font-weight: 500;
}

.report-table .downtime {
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