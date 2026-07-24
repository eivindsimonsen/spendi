import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupAuthGuard } from './router/guards'
import './styles/global.css'

const app = createApp(App)

app.use(createPinia())
setupAuthGuard(router)
app.use(router)
app.mount('#app')
