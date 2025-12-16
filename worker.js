/**
 * Cloudflare Worker for Home Care Leave System
 * 
 * Features:
 * 1. User Binding (Staff <-> LINE)
 * 2. Leave Application (with Proof Upload & Case List)
 * 3. Supervisor Dashboard (Approve/Reject)
 * 4. Staff "My Records" (View & Cancel)
 * 5. Monthly Leaderboard
 * 6. Automated LINE Notifications
 */

// --- Frontend Application (Vue.js + Tailwind) ---
const indexHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>204府城大師</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; }
        .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 16px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); }
        .btn-primary { background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%); transition: all 0.3s ease; }
        .btn-primary:active { transform: scale(0.98); }
        .fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
        .fade-enter-from, .fade-leave-to { opacity: 0; }
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #c7c7c7; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
    </style>
</head>
<body class="text-gray-800 antialiased p-4 flex justify-center items-start pt-10">
    <div id="app" class="w-full max-w-md relative">
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/50 backdrop-blur-sm rounded-2xl h-96">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p class="mt-4 text-indigo-800 font-medium">載入中...</p>
        </div>

        <!-- Main Content -->
        <transition name="fade">
            <div v-if="!loading" class="glass-card p-6 w-full">
                <!-- Header -->
                <div class="mb-6 text-center">
                    <h1 class="text-2xl font-bold text-gray-900">請假申請</h1>
                    <p class="text-sm text-gray-500 mt-1">204府城大師</p>
                </div>

                <!-- 1. Registration View (Unbound) -->
                <div v-if="!user.registered">
                    <div class="space-y-4">
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                            <p class="text-sm text-yellow-700">您尚未綁定員工資料，請先完成驗證。</p>
                            <p class="text-xs text-yellow-600 mt-1">若您有多個服務單位，可在此綁定第二個單位的資料。</p>
                        </div>
                        
                        <!-- Unit Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">選擇單位</label>
                            <select v-model="regForm.unit" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border">
                                <option disabled value="">請選擇</option>
                                <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                            </select>
                        </div>

                        <!-- Name Input -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">您的姓名</label>
                            <input type="text" v-model="regForm.name" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border" placeholder="請輸入姓名">
                        </div>

                        <!-- Staff ID Verification -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">員工編號 (Staff ID)</label>
                            <input type="text" v-model="regForm.staffId" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border" placeholder="請輸入員工編號">
                        </div>

                        <button @click="bindUser" :disabled="submitting" class="w-full btn-primary text-white font-bold py-3 px-4 rounded-xl shadow-lg mt-4 disabled:opacity-50">
                            {{ submitting ? '驗證中...' : '確認綁定' }}
                        </button>
                        

                    </div>
                </div>

                <!-- 2. Supervisor Dashboard -->
                <div v-else-if="['Supervisor', '督導'].includes(user.role)">
                    <div class="mb-4 flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                        <div>
                            <span class="text-purple-900 font-medium block">👋 您好，{{ user.name }}</span>
                            <div @click="showProfileSelector = true" class="flex items-center space-x-1 cursor-pointer mt-1">
                                <span class="text-xs text-purple-600 underline">
                                    {{ user.profiles && user.profiles.length > 1 ? '切換身份 (' + user.profiles.length + ')' : '+ 綁定新單位' }}
                                </span>
                            </div>
                        </div>
                        <div class="flex space-x-1">
                            <span class="text-xs bg-white text-purple-600 border border-purple-200 px-2 py-1 rounded-full">{{ user.unit }}</span>
                            <span class="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">督導</span>
                        </div>
                    </div>

                    <!-- Leaderboard Widget -->
                    <div class="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center">
                            🏆 本月請假排行榜 (前五名)
                        </h3>
                        <div v-if="monthlyStats.length === 0" class="text-xs text-gray-400 text-center py-2">
                            本月尚無核准的請假紀錄
                        </div>
                        <div v-else class="space-y-3">
                            <div v-for="(stat, idx) in monthlyStats" :key="stat.name" class="relative">
                                <div class="flex justify-between text-xs mb-1">
                                    <span class="font-medium text-gray-700">
                                        <span class="inline-block w-4 text-center mr-1" :class="{'text-yellow-500 font-bold': idx < 3, 'text-gray-400': idx >= 3}">{{ idx + 1 }}</span>
                                        {{ stat.name }}
                                    </span>
                                    <span class="text-indigo-600 font-bold">{{ stat.days }} 天</span>
                                </div>
                                <div class="w-full bg-gray-100 rounded-full h-2">
                                    <div class="bg-indigo-500 h-2 rounded-full transition-all duration-500" :style="{ width: (stat.days / maxDays * 100) + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="flex space-x-2 mb-4 border-b border-gray-200">
                        <button @click="activeTab = 'pending'" :class="activeTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'" class="flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm">
                            待審核
                            <span v-if="pendingLeaves.length > 0" class="ml-1 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{{ pendingLeaves.length }}</span>
                        </button>
                        <button @click="activeTab = 'history'" :class="activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'" class="flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm">
                            全部紀錄
                        </button>
                    </div>

                    <!-- Tab: Pending -->
                    <div v-if="activeTab === 'pending'" class="space-y-4">
                        <div v-if="pendingLeaves.length === 0" class="text-center py-8 text-gray-400">
                            <p>目前沒有待審核的假單 🎉</p>
                        </div>
                        <div v-for="leave in pendingLeaves" :key="leave.id" class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h3 class="font-bold text-gray-900">{{ leave.name }}</h3>
                                    <span class="text-xs text-gray-500">{{ leave.timestamp.split('T')[0] }} 申請</span>
                                </div>
                                <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">{{ leave.leaveType }}</span>
                            </div>
                            <div class="text-sm text-gray-600 space-y-1 mb-3">
                                <p>📅 日期: <span class="font-medium text-gray-800">{{ leave.date }}</span></p>
                                <p>📝 原因: {{ leave.reason }}</p>
                                
                                <!-- Case List -->
                                <div v-if="leave.cases && leave.cases.length > 0" class="mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <p class="text-xs font-bold text-gray-500 mb-1">受影響個案:</p>
                                    <ul class="space-y-1">
                                        <li v-for="(c, idx) in leave.cases" :key="idx" class="text-xs text-gray-700 flex justify-between">
                                            <span>👤 {{ c.name }}</span>
                                            <span class="text-gray-500">{{ c.time }}</span>
                                        </li>
                                    </ul>
                                </div>

                                <div v-if="leave.proofUrl">
                                    <a :href="leave.proofUrl" target="_blank" class="text-indigo-600 hover:underline text-xs flex items-center mt-2">
                                        📎 查看證明文件
                                    </a>
                                </div>
                            </div>
                            <div class="flex space-x-2 pt-2 border-t border-gray-100">
                                <button @click="reviewLeave(leave, 'approve')" class="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg text-sm font-medium transition">
                                    核准
                                </button>
                                <button @click="reviewLeave(leave, 'reject')" class="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded-lg text-sm font-medium transition">
                                    駁回
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: History -->
                    <div v-else class="space-y-3">
                        <div class="relative">
                            <input v-model="searchText" placeholder="搜尋姓名..." class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <div class="max-h-96 overflow-y-auto space-y-2">
                            <div v-for="leave in filteredHistory" :key="leave.id" class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                <div class="flex justify-between">
                                    <span class="font-medium">{{ leave.name }}</span>
                                    <span :class="{
                                        'text-green-600': leave.status === 'Approved',
                                        'text-red-600': leave.status === 'Rejected',
                                        'text-yellow-600': leave.status === 'Pending',
                                        'text-gray-500': leave.status === 'Cancelled'
                                    }" class="text-xs font-bold">{{ leave.status === 'Approved' ? '已核准' : (leave.status === 'Rejected' ? '已駁回' : (leave.status === 'Cancelled' ? '已取消' : '待審核')) }}</span>
                                </div>
                                <div class="flex justify-between mt-1 text-gray-500 text-xs">
                                    <span>{{ leave.date }} ({{ leave.leaveType }})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Staff Leave Form View -->
                <div v-else>
                    <div class="mb-4 flex items-center justify-between bg-indigo-50 p-3 rounded-lg">
                        <div>
                            <span class="text-indigo-900 font-medium block">👋 你好，{{ user.name }}</span>
                            <div @click="showProfileSelector = true" class="flex items-center space-x-1 cursor-pointer mt-1">
                                <span class="text-xs text-indigo-600 underline">
                                    {{ user.profiles && user.profiles.length > 1 ? '切換身份 (' + user.profiles.length + ')' : '+ 綁定新單位' }}
                                </span>
                            </div>
                        </div>
                        <div class="flex space-x-1">
                            <span class="text-xs bg-white text-indigo-600 border border-indigo-200 px-2 py-1 rounded-full">{{ user.unit }}</span>
                            <span class="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">{{ user.role }}</span>
                        </div>
                    </div>

                    <!-- Tabs for Staff -->
                    <div class="flex space-x-2 mb-4 border-b border-gray-200 relative z-10">
                        <button type="button" @click="switchTab('apply')" :class="activeTab === 'apply' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'" class="flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm cursor-pointer">
                            申請請假
                        </button>
                        <button type="button" @click="switchTab('my_records')" :class="activeTab === 'my_records' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'" class="flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm cursor-pointer">
                            我的紀錄
                        </button>
                    </div>

                    <!-- Tab: Apply -->
                    <form v-if="activeTab === 'apply'" @submit.prevent="submitLeave" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">請假日期</label>
                            <input type="date" v-model="leaveForm.date" required class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border">
                        </div>
                        <div class="flex space-x-6">
                            <div class="flex-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                                <input type="time" v-model="leaveForm.startTime" required class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border">
                            </div>
                            <div class="flex-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
                                <input type="time" v-model="leaveForm.endTime" required class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">假別</label>
                            <select v-model="leaveForm.leaveType" required class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border">
                                <option value="病假">病假</option>
                                <option value="事假">事假</option>
                                <option value="特休">特休</option>
                                <option value="喪假">喪假</option>
                                <option value="婚假">婚假</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">請假事由</label>
                            <textarea v-model="leaveForm.reason" rows="2" required class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border" placeholder="請簡述原因..."></textarea>
                        </div>
                        <div v-if="['病假', '喪假', '婚假'].includes(leaveForm.leaveType)">
                            <label class="block text-sm font-medium text-gray-700 mb-1">證明文件 <span class="text-red-500">*</span></label>
                            <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors cursor-pointer relative">
                                <input type="file" @change="handleFileUpload" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                                <div class="space-y-1 text-center">
                                    <span class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                                        {{ leaveForm.proofPreview ? '更換圖片' : '上傳圖片' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Case List -->
                        <div class="pt-4 border-t border-gray-200">
                            <div class="flex justify-between items-center mb-3">
                                <label class="block text-sm font-medium text-gray-900">受影響個案</label>
                                <button type="button" @click="addCase" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition">+ 新增個案</button>
                            </div>
                            <div v-if="leaveForm.cases.length === 0" class="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">無受影響個案</div>
                            <div v-for="(item, index) in leaveForm.cases" :key="index" class="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                                <div class="relative mb-2">
                                    <input v-model="item.caseName" placeholder="個案姓名" class="text-sm w-full rounded border-gray-300 py-1.5 pl-2 pr-8 border">
                                    <button type="button" @click="removeCase(index)" class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-red-500 z-10 p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div class="flex space-x-2">
                                    <input type="time" v-model="item.startTime" class="text-sm w-1/2 rounded border-gray-300 py-1.5 px-2 border">
                                    <span class="text-gray-400 self-center">~</span>
                                    <input type="time" v-model="item.endTime" class="text-sm w-1/2 rounded border-gray-300 py-1.5 px-2 border">
                                </div>
                            </div>
                        </div>

                        <div class="pt-4">
                            <button type="submit" :disabled="submitting" class="w-full btn-primary text-white font-bold py-3 px-4 rounded-xl shadow-lg disabled:opacity-50">
                                {{ submitting ? '送出中...' : '送出申請' }}
                            </button>
                        </div>
                    </form>

                    <!-- Tab: My Records -->
                    <div v-if="activeTab === 'my_records'" class="space-y-3">
                        <div v-if="!allLeaves || allLeaves.length === 0" class="text-center py-8 text-gray-400">
                            <p>尚無請假紀錄</p>
                        </div>
                        <div v-else class="space-y-3">
                            <div v-for="leave in allLeaves" :key="leave.id" class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 class="font-bold text-gray-900">{{ leave.leaveType }}</h3>
                                        <span class="text-xs text-gray-500">{{ leave.date }}</span>
                                    </div>
                                    <span :class="{
                                        'bg-green-100 text-green-800': leave.status === 'Approved',
                                        'bg-red-100 text-red-800': leave.status === 'Rejected',
                                        'bg-yellow-100 text-yellow-800': leave.status === 'Pending',
                                        'bg-gray-100 text-gray-800': leave.status === 'Cancelled'
                                    }" class="text-xs px-2 py-1 rounded-full font-medium">
                                        {{ leave.status === 'Approved' ? '已核准' : (leave.status === 'Rejected' ? '已駁回' : (leave.status === 'Cancelled' ? '已取消' : '待審核')) }}
                                    </span>
                                </div>
                                <p class="text-sm text-gray-600 mb-2">{{ leave.reason }}</p>
                                <div v-if="leave.status === 'Pending'" class="pt-2 border-t border-gray-100">
                                    <button @click="cancelLeave(leave)" class="w-full bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-sm font-medium transition">
                                        撤回申請
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
        <!-- Success Modal -->
        <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div class="relative p-5 border w-80 shadow-lg rounded-md bg-white text-center">
                <div class="mt-3">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                        <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mt-4">{{ modalMessage }}</h3>
                    <div class="mt-6 px-4 py-3">
                        <button @click="closeSuccessModal" class="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            確定
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Profile Selector Modal -->
        <div v-if="showProfileSelector" class="fixed inset-0 bg-gray-900/50 flex items-end sm:items-center justify-center z-[60]">
            <div class="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-xl p-6 shadow-2xl transform transition-all">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">選擇身份</h3>
                    <button @click="showProfileSelector = false" class="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div class="space-y-3 max-h-80 overflow-y-auto">
                    <div v-for="(p, idx) in user.profiles" :key="idx" 
                        @click="switchProfile(p)"
                        :class="user.unit === p.unit ? 'border-2 border-indigo-500 bg-indigo-50' : 'border border-gray-200 hover:bg-gray-50'"
                        class="p-4 rounded-xl cursor-pointer transition-all relative">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-gray-800">{{ p.unit }}</p>
                                <p class="text-sm text-gray-600">{{ p.name }} ({{ p.role }})</p>
                            </div>
                            <div v-if="user.unit === p.unit" class="text-indigo-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>
                <button @click="user.registered = false; showProfileSelector = false" class="w-full mt-4 py-3 text-indigo-600 font-medium text-sm hover:bg-indigo-50 rounded-lg">
                    + 綁定新機構
                </button>
            </div>
        </div>

    </div>

    <script>
        const { createApp, ref, onMounted, reactive, computed } = Vue;
        const API_BASE = ''; 

        createApp({
            setup() {
                const loading = ref(true);
                const submitting = ref(false);
                const user = ref({ registered: false, name: '', role: '', uid: '', unit: '', profiles: [] });
                const showProfileSelector = ref(false);
                const units = ref([]); 
                const debugInfo = ref(null);
                
                // Supervisor State
                const activeTab = ref('pending'); 
                const allLeaves = ref([]);
                const searchText = ref('');

                const switchTab = (tab) => {
                    activeTab.value = tab;
                    if (tab === 'my_records' && (!allLeaves.value || allLeaves.value.length === 0)) {
                        fetchLeaves();
                    }
                };

                const regForm = reactive({ unit: '', name: '', staffId: '' });
                const leaveForm = reactive({
                    date: new Date().toISOString().split('T')[0],
                    startTime: '08:00',
                    endTime: '17:00',
                    leaveType: '事假',
                    reason: '',
                    proofBase66: null,
                    proofPreview: null,
                    cases: []
                });

                const initLiff = async () => {
                    try {
                        await liff.init({ liffId: "2008645610-0MezRE9Z" });
                        if (!liff.isLoggedIn()) { liff.login(); return; }
                        const profile = await liff.getProfile();
                        user.value.uid = profile.userId;
                        checkUserStatus(profile.userId);
                    } catch (err) {
                        alert('LIFF Init Failed: ' + err.message);
                        loading.value = false;
                    }
                };

                const checkUserStatus = async (uid) => {
                    try {
                        allLeaves.value = []; // Clear previous data
                        const res = await fetch(API_BASE + '/api/check-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uid })
                        });
                        const data = await res.json();
                        
                        if (data.debug) {
                            debugInfo.value = data.debug;
                            console.log('Debug:', data.debug);
                        }

                        if (data.registered) {
                            user.value.registered = true;
                            user.value.profiles = data.profiles || [];
                            units.value = data.units || []; // Populate units for "Bind New"
                            
                            // Auto-select first profile if none selected
                            if (!user.value.unit && user.value.profiles.length > 0) {
                                const first = user.value.profiles[0];
                                user.value.name = first.name;
                                user.value.role = first.role;
                                user.value.unit = first.unit;
                            }
                            
                            // If multiple profiles, show selector? No, auto-select first is better UX, let them switch.
                            
                            if (['Supervisor', '督導'].includes(user.value.role)) {
                                activeTab.value = 'pending';
                                fetchLeaves();
                            } else {
                                // Deep Linking Logic
                                const params = new URLSearchParams(window.location.search);
                                const targetTab = params.get('tab');
                                if (targetTab === 'my_records') {
                                    activeTab.value = 'my_records';
                                } else {
                                    activeTab.value = 'apply';
                                }
                                fetchLeaves();
                            }
                        } else {
                            user.value.registered = false;
                            units.value = data.units || [];
                        }
                    } catch (err) {
                        alert('API Error: ' + err.message);
                    } finally {
                        loading.value = false;
                    }
                };

                const switchProfile = (profile) => {
                    user.value.name = profile.name;
                    user.value.role = profile.role;
                    user.value.unit = profile.unit;
                    showProfileSelector.value = false;
                    
                    // Reset View based on role
                    if (['Supervisor', '督導'].includes(profile.role)) {
                        activeTab.value = 'pending';
                    } else {
                        activeTab.value = 'apply';
                    }
                    
                    // Refetch Data for new context
                    allLeaves.value = [];
                    fetchLeaves();
                };

                const fetchLeaves = async () => {
                    try {
                        const res = await fetch(API_BASE + '/api/get-leaves', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uid: user.value.uid })
                        });
                        const data = await res.json();
                        if (data.success) {
                            allLeaves.value = data.leaves || [];
                            if (data.debug) console.log('Debug:', data.debug);
                        } else {
                            console.error('Fetch failed:', data.message);
                            // alert('無法取得資料: ' + data.message);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                };

                const reviewLeave = async (leave, action) => {
                    const actionText = action === 'approve' ? '核准' : '駁回';
                    if(!confirm('確定要' + actionText + ' ' + leave.name + ' 的假單嗎？')) return;

                    try {
                        const res = await fetch(API_BASE + '/api/review-leave', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                uid: user.value.uid, 
                                targetUid: leave.uid,
                                timestamp: leave.timestamp,
                                action: action,
                                name: leave.name
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert('已更新狀態');
                            fetchLeaves(); 
                        } else {
                            alert('操作失敗: ' + data.message);
                        }
                    } catch (e) { alert(e.message); }
                };

                const cancelLeave = async (leave) => {
                    if(!confirm('確定要撤回這張假單嗎？')) return;
                    try {
                        const res = await fetch(API_BASE + '/api/cancel-leave', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                uid: user.value.uid,
                                timestamp: leave.timestamp
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert('已撤回');
                            fetchLeaves(); 
                        } else {
                            alert('操作失敗: ' + data.message);
                        }
                    } catch (e) { alert(e.message); }
                };

                const bindUser = async () => {
                    if (!regForm.unit || !regForm.name || !regForm.staffId) return alert('請填寫完整');
                    submitting.value = true;
                    try {
                        const res = await fetch(API_BASE + '/api/bind-user', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                uid: user.value.uid,
                                unit: regForm.unit,
                                name: regForm.name,
                                staffId: regForm.staffId 
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert('綁定成功');
                            window.location.reload();
                        } else {
                            alert(data.message || '綁定失敗');
                        }
                    } catch (e) { alert(e.message); }
                    submitting.value = false;
                };

                const showModal = ref(false);
                const modalMessage = ref('');

                const closeSuccessModal = () => {
                    showModal.value = false;
                    liff.closeWindow();
                };
                const submitLeave = async () => {
                    if (['病假', '喪假', '婚假'].includes(leaveForm.leaveType) && !leaveForm.proofBase66) return alert('需上傳證明');
                    
                    // Validate Global Time
                    if (!leaveForm.startTime || !leaveForm.endTime) return alert('請填寫完整時間');
                    const start = new Date(\`2000-01-01T\${leaveForm.startTime}\`);
                    const end = new Date(\`2000-01-01T\${leaveForm.endTime}\`);
                    const diff = (end - start) / (1000 * 60); // minutes
                    
                    if (diff < 0) return alert('結束時間必須晚於開始時間');
                    if (diff < 60) return alert('請假時間至少需1小時');

                    // Format Global Time
                    const globalTimeSlot = \`\${leaveForm.startTime} ~ \${leaveForm.endTime}\`;
                    const duration = (diff / 60).toFixed(1); // Calculate Hours

                    submitting.value = true;
                    try {
                        const payload = {...leaveForm, timeSlot: globalTimeSlot, duration: duration, uid: user.value.uid, name: user.value.name, unit: user.value.unit };
                        const res = await fetch(API_BASE + '/api/submit-leave', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        if (data.success) {
                            modalMessage.value = '申請已送出';
                            showModal.value = true;
                            fetchLeaves(); // Refresh data
                        } else {
                            alert(data.error || '失敗');
                        }
                    } catch (e) { alert(e.message); }
                    submitting.value = false;
                };

                const handleFileUpload = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        leaveForm.proofBase66 = e.target.result;
                        leaveForm.proofPreview = e.target.result;
                    };
                    reader.readAsDataURL(file);
                };

                const addCase = () => leaveForm.cases.push({caseName: '', startTime: '', endTime: '' });
                const removeCase = (i) => leaveForm.cases.splice(i, 1);

                // Computed
                const pendingLeaves = computed(() => {
                    return allLeaves.value.filter(l => l.status === 'Pending');
                });

                const filteredHistory = computed(() => {
                    let list = allLeaves.value;
                    if (searchText.value) {
                        list = list.filter(l => l.name.includes(searchText.value));
                    }
                    return list;
                });

                // Leaderboard Logic
                const maxDays = ref(1); 
                const monthlyStats = computed(() => {
                    const now = new Date();
                    const currentMonth = now.toISOString().slice(0, 7); 
                    const validLeaves = allLeaves.value.filter(l => l.status === 'Approved' && l.date.startsWith(currentMonth));
                    const userDays = { }; 
                    validLeaves.forEach(l => {
                        if (!userDays[l.name]) userDays[l.name] = new Set();
                        userDays[l.name].add(l.date);
                    });
                    const stats = Object.keys(userDays).map(name => ({ name: name, days: userDays[name].size }));
                    stats.sort((a, b) => b.days - a.days);
                    if (stats.length > 0) maxDays.value = Math.max(...stats.map(s => s.days));
                    return stats.slice(0, 5);
                });

                onMounted(() => initLiff());

                return {
                    allLeaves, // <--- CRITICAL FIX
                    loading, submitting, user, units, regForm, leaveForm, debugInfo,
                    activeTab, pendingLeaves, filteredHistory, searchText,
                    monthlyStats, maxDays, switchTab,
                    bindUser, submitLeave, handleFileUpload, addCase, removeCase, reviewLeave, cancelLeave,
                    showModal, modalMessage, closeSuccessModal,
                    showProfileSelector, switchProfile
                };
            }
        }).mount('#app');
    </script>
</body>
</html>`;


// --- Backend Worker ---
export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const path = url.pathname;

            // CORS Headers
            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            };

            if (request.method === 'OPTIONS') {
                return new Response(null, { headers: corsHeaders });
            }

            // 1. Serve Frontend
            if (request.method === 'GET' && (path === '/' || path === '/index.html')) {
                return new Response(indexHtml, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
                });
            }

            // 2. API: Check User (Dynamic Sheet Name Fix)
            if (request.method === 'POST' && path === '/api/check-user') {
                try {
                    const { uid } = await request.json();
                    const token = await getAccessToken(env);

                    // 1. Get Spreadsheet Metadata to find the correct Sheet Name
                    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
                    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
                    const metaData = await metaResp.json();

                    if (metaData.error) {
                        throw new Error(`Metadata Error: ${metaData.error.message}`);
                    }

                    // Use the FIRST sheet found (Robust Fix)
                    const firstSheetName = metaData.sheets[0].properties.title;

                    // Fetch Data using encoded range
                    const range = `${firstSheetName}!A2:F`;
                    const sheetData = await getSheetData(env.SHEET_ID, range, token);

                    const user = sheetData.find(row => row[3] === uid); // Col D is UID (index 3)

                    const userProfiles = sheetData.filter(row => row[3] === uid).map(row => ({
                        unit: row[0],
                        name: row[1],
                        role: row[2]
                    }));

                    // Always return units for binding new
                    const units = [...new Set(sheetData.map(row => row[0]).filter(u => u))];

                    if (userProfiles.length > 0) {
                        return new Response(JSON.stringify({
                            registered: true,
                            profiles: userProfiles,
                            units: units // Return units even if registered to allow "Add Agency"
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                    } else {
                        return new Response(JSON.stringify({
                            registered: false,
                            units: units,
                            debug: {
                                usedSheetName: firstSheetName,
                                rowsFetched: sheetData.length,
                                serviceAccount: env.GOOGLE_CLIENT_EMAIL
                            }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                    }
                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                }
            }

            // 3. API: Bind User
            if (request.method === 'POST' && path === '/api/bind-user') {
                try {
                    const { uid, unit, name, staffId } = await request.json();
                    const token = await getAccessToken(env);

                    // Get Sheet Name dynamically
                    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
                    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
                    const metaData = await metaResp.json();
                    const firstSheetName = metaData.sheets[0].properties.title;

                    const range = `${firstSheetName}!A2:F`;
                    const rows = await getSheetData(env.SHEET_ID, range, token);

                    // Find matching user
                    let rowIndex = -1;
                    for (let i = 0; i < rows.length; i++) {
                        // Unit(0) matches AND Name(1) matches AND Staff_ID(4) matches AND UID(3) is empty
                        if (rows[i][0] === unit && rows[i][1] === name && rows[i][4] == staffId && !rows[i][3]) {
                            rowIndex = i + 2; // 1-based index, + header
                            break;
                        }
                    }

                    if (rowIndex === -1) {
                        return new Response(JSON.stringify({ success: false, message: '驗證失敗：單位、姓名或員工編號錯誤，或已被綁定' }), { headers: corsHeaders });
                    }

                    // Update UID (Col D -> index 3 -> Column D)
                    await updateSheetCell(env.SHEET_ID, `${firstSheetName}!D${rowIndex}`, uid, token);

                    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                }
            }

            // 4. API: Submit Leave
            if (request.method === 'POST' && path === '/api/submit-leave') {
                try {
                    const form = await request.json();
                    const token = await getAccessToken(env);

                    // Upload Image if exists
                    let proofUrl = '';
                    if (form.proofBase66) {
                        proofUrl = await uploadImageToDrive(form.proofBase66, form.name, form.date, env.DRIVE_FOLDER_ID, token);
                    }

                    // Calculate Duration (Backend Fallback)
                    let duration = form.duration;
                    if (!duration && form.startTime && form.endTime) {
                        const start = new Date(`2000-01-01T${form.startTime}`);
                        const end = new Date(`2000-01-01T${form.endTime}`);
                        const diff = (end - start) / (1000 * 60); // minutes
                        duration = (diff / 60).toFixed(1);
                    }

                    // Save to Sheet
                    const timestamp = new Date().toISOString();
                    const rowsToAdd = [];

                    if (form.cases && form.cases.length > 0) {
                        form.cases.forEach(c => {
                            // Case time is optional, if not provided, use global time or empty? 
                            // Current logic: Case time inputs are removed from UI, so we use global time for the record
                            // But wait, user might want per-case time? 
                            // The request was "Leave Date below add Leave Time Start/End". 
                            // Usually this implies the MAIN leave time. 
                            // Let's assume the global time applies to the leave record itself (Col G).
                            // And cases are just list of people affected.

                            // Construct Case String: Name (Start~End)
                            const caseTimeStr = c.startTime && c.endTime ? `(${c.startTime}~${c.endTime})` : '';
                            const caseDetail = `${c.caseName} ${caseTimeStr}`;

                            rowsToAdd.push([
                                timestamp, form.unit, form.uid, form.name, form.leaveType, form.date,
                                form.timeSlot, // Col G: Global Time
                                caseDetail,    // Col H: Case Name + Time
                                form.reason, proofUrl, 'Pending',
                                form.duration  // Col L: Duration (Hours)
                            ]);
                        });
                    } else {
                        rowsToAdd.push([
                            timestamp, form.unit, form.uid, form.name, form.leaveType, form.date,
                            form.timeSlot, // Col G: Global Time
                            '',            // Col H: Empty Case
                            form.reason, proofUrl, 'Pending',
                            duration  // Col L: Duration (Hours)
                        ]);
                    }

                    await appendSheetRows(env.SHEET_ID, 'Leave_Records', rowsToAdd, token);

                    // Send Notification
                    await sendApprovalNotification(form, proofUrl, timestamp, env, token);

                    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                }
            }

            // 5. API: Get Leaves
            if (request.method === 'POST' && path === '/api/get-leaves') {
                try {
                    const { uid } = await request.json();
                    const token = await getAccessToken(env);

                    // Get User Info (Dynamic Sheet Name)
                    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
                    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
                    const metaData = await metaResp.json();
                    const firstSheetName = metaData.sheets[0].properties.title;

                    const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
                    const user = staffRows.find(r => r[3] === uid);

                    if (!user) throw new Error('User not found');

                    const isSupervisor = ['Supervisor', '督導'].includes(user[2]);
                    const userUnit = user[0];

                    // 2. Check if Leave_Records exists
                    const sheetExists = metaData.sheets.some(s => s.properties.title === 'Leave_Records');
                    if (!sheetExists) {
                        return new Response(JSON.stringify({
                            success: false,
                            message: '系統錯誤：找不到 "Leave_Records" 工作表。請在 Google Sheet 中建立名為 "Leave_Records" 的分頁。',
                            debug: { error: 'Sheet Leave_Records not found' }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                    }

                    // 3. Get Leaves (Fetch Header + Data)
                    const allRows = await getSheetData(env.SHEET_ID, 'Leave_Records!A1:K', token);

                    if (allRows.length < 2) {
                        return new Response(JSON.stringify({
                            success: true,
                            leaves: [],
                            debug: { message: 'Sheet is empty or only has header' }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                    }

                    const header = allRows[0].map(h => h.trim().toLowerCase());
                    const rows = allRows.slice(1);

                    // Fixed Column Mapping (Matches the write order in submit-leave)
                    const colMap = {
                        timestamp: 0,
                        unit: 1,
                        uid: 2,
                        name: 3,
                        leaveType: 4,
                        date: 5,
                        time: 6,
                        case: 7,
                        reason: 8,
                        proof: 9,
                        status: 10,
                        duration: 11 // Col L
                    };

                    // Group by Timestamp + UID
                    const leavesMap = new Map();
                    let comparisonLog = [];

                    rows.forEach((r, i) => {
                        const rowUnit = String(r[colMap.unit] || '').trim();
                        const rowUid = String(r[colMap.uid] || '').trim();
                        const rowName = String(r[colMap.name] || '').trim();

                        const targetUnit = String(userUnit || '').trim();
                        const targetUid = String(uid || '').trim();
                        const targetName = String(user[1] || '').trim(); // user[1] is Name from Staff_List

                        // Debug first 3 rows comparison
                        if (i < 3) {
                            comparisonLog.push(`Row ${i}: SheetUID='${rowUid}' vs TargetUID='${targetUid}' -> Match? ${rowUid.toLowerCase() === targetUid.toLowerCase()}`);
                        }

                        if (isSupervisor) {
                            // Supervisor sees all in Unit
                            if (rowUnit !== targetUnit) return;
                        } else {
                            // Staff sees only their own UID AND Name (to prevent leakage if UID is reused)
                            if (rowUid.toLowerCase() !== targetUid.toLowerCase() || rowName !== targetName) return;
                        }

                        const key = r[colMap.timestamp] + '_' + r[colMap.uid];

                        if (!leavesMap.has(key)) {
                            leavesMap.set(key, {
                                id: key,
                                timestamp: r[colMap.timestamp],
                                uid: r[colMap.uid],
                                name: r[colMap.name],
                                leaveType: r[colMap.leaveType],
                                date: r[colMap.date],
                                reason: r[colMap.reason],
                                proofUrl: r[colMap.proof],
                                status: r[colMap.status] || 'Pending',
                                cases: []
                            });
                        }
                        if (r[colMap.case] || r[colMap.time]) {
                            leavesMap.get(key).cases.push({
                                name: r[colMap.case] || '未指定',
                                time: r[colMap.time] || ''
                            });
                        }
                    });

                    const leaves = Array.from(leavesMap.values());

                    // Sort by timestamp desc (Safe Sort)
                    leaves.sort((a, b) => {
                        const dateA = new Date(a.timestamp).getTime() || 0;
                        const dateB = new Date(b.timestamp).getTime() || 0;
                        return dateB - dateA;
                    });

                    return new Response(JSON.stringify({
                        success: true,
                        leaves: leaves,
                        debug: {
                            totalRows: rows.length,
                            filteredCount: leaves.length,
                            userRole: user[2],
                            requestUid: uid,
                            colMap: colMap,
                            comparisonLog: comparisonLog
                        }
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });




                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                }
            }

            // 6. API: Review Leave
            if (request.method === 'POST' && path === '/api/review-leave') {
                try {
                    const { uid, targetUid, timestamp, action, name } = await request.json();
                    const token = await getAccessToken(env);

                    const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:K', token);
                    let updatedCount = 0;
                    let leaveDate = '';

                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i][0] === timestamp && rows[i][2] === targetUid) {
                            const status = action === 'approve' ? 'Approved' : 'Rejected';
                            await updateSheetCell(env.SHEET_ID, `Leave_Records!K${i + 1}`, status, token);
                            leaveDate = rows[i][5];
                            updatedCount++;
                        }
                    }

                    if (updatedCount > 0) {
                        const statusText = action === 'approve' ? '核准' : '駁回';
                        await fetch('https://api.line.me/v2/bot/message/push', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
                            },
                            body: JSON.stringify({
                                to: targetUid,
                                messages: [{ type: 'text', text: `您的假單(${name}) - ${leaveDate} 已被${statusText}` }]
                            })
                        });
                        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
                    } else {
                        return new Response(JSON.stringify({ success: false, message: '找不到該假單' }), { headers: corsHeaders });
                    }

                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                }
            }

            // 7. API: Cancel Leave
            if (request.method === 'POST' && path === '/api/cancel-leave') {
                try {
                    const { uid, timestamp } = await request.json();
                    const token = await getAccessToken(env);

                    const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:K', token);
                    let updatedCount = 0;

                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i][0] === timestamp && rows[i][2] === uid) {
                            if (rows[i][10] !== 'Pending') {
                                return new Response(JSON.stringify({ success: false, message: '只能撤回待審核的假單' }), { headers: corsHeaders });
                            }
                            await updateSheetCell(env.SHEET_ID, `Leave_Records!K${i + 1}`, 'Cancelled', token);
                            updatedCount++;
                        }
                    }

                    if (updatedCount > 0) {
                        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
                    } else {
                        return new Response(JSON.stringify({ success: false, message: '找不到該假單' }), { headers: corsHeaders });
                    }

                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                }
            }

            // 8. Webhook: LINE
            if (request.method === 'POST' && path === '/webhook') {
                const body = await request.json();
                const events = body.events || [];

                for (const event of events) {
                    if (event.type === 'postback') {
                        await handlePostback(event, env);
                    } else if (event.type === 'follow') {
                        await handleFollow(event, env);
                    } else if (event.type === 'message' && event.message.type === 'text') {
                        await handleMessage(event, env);
                    }
                }
                return new Response('OK');
            }

            return new Response(JSON.stringify({ error: 'Not Found', path: path }), { status: 404, headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Global Worker Error: ' + e.message, stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    },
};

// --- Helper Functions ---

async function getAccessToken(env) {
    const pem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const clientEmail = env.GOOGLE_CLIENT_EMAIL;

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    const key = await importPrivateKey(pem);
    const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        key,
        new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${signatureInput}.${encodedSignature}`;

    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await resp.json();
    return data.access_token;
}

async function importPrivateKey(pem) {
    const binaryDerString = atob(pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, ''));
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    return crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );
}

// --- Google Sheets API Wrappers ---

async function getSheetData(sheetId, range, token) {
    // IMPORTANT: encodeURIComponent is crucial for handling special chars like '!' in range
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resp.json();
    if (data.error) {
        throw new Error(`Google Sheets API Error: ${data.error.message} (${data.error.code})`);
    }
    return data.values || [];
}

async function updateSheetCell(sheetId, range, value, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[value]] }),
    });
}

async function appendSheetRows(sheetId, range, values, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: values }),
    });
}

// --- Drive API Wrapper ---
// --- Drive API Wrapper (Via GAS Web App) ---
async function uploadImageToDrive(base66, name, date, folderId, token) {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyuknVDwqW2Syj0aZRITSyPTsPPFdxh4D1RDq0NCQCGlaSMtvw0nvdj5cUg9Yx7tzeyug/exec';

    const cleanBase66 = base66.split(',')[1];
    const mimeType = base66.split(';')[0].split(':')[1];

    const payload = {
        type: 'upload',
        base66: cleanBase66,
        mimeType: mimeType,
        name: `LeaveProof_${name}_${date}.jpg`,
        folderId: folderId
    };

    const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        throw new Error(`GAS Upload Failed: ${resp.status}`);
    }

    const result = await resp.json();

    if (!result.success) {
        throw new Error(`GAS Upload Error: ${result.error}`);
    }

    return result.url;
}

// --- LINE API ---
async function sendApprovalNotification(data, proofUrl, timestamp, env, token) {
    // 1. Get Applicant's Unit
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
    const metaData = await metaResp.json();
    const firstSheetName = metaData.sheets[0].properties.title;

    const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
    const applicant = staffRows.find(r => r[3] === data.uid);

    if (!applicant) return;
    const unit = applicant[0];

    // 2. Find Supervisors in SAME Unit
    const supervisors = staffRows
        .filter(row => row[0] === unit && ['Supervisor', '督導'].includes(row[2]) && row[3])
        .map(row => row[3]);

    if (supervisors.length === 0) return;

    // Build Body Contents
    const bodyContents = [
        {
            type: "box",
            layout: "horizontal",
            contents: [
                { type: "text", text: "請假審核", weight: "bold", color: "#4F46E5", size: "xs" },
                { type: "text", text: "待處理", align: "end", color: "#F59E0B", size: "xs", weight: "bold" }
            ],
            margin: "none"
        },
        {
            type: "text",
            text: data.name,
            weight: "bold",
            size: "3xl",
            margin: "sm",
            color: "#1F2937"
        },
        {
            type: "text",
            text: unit,
            size: "sm",
            color: "#6B7280",
            margin: "xs"
        },
        {
            type: "separator",
            margin: "lg",
            color: "#E5E7EB"
        },
        {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            backgroundColor: "#F9FAFB",
            cornerRadius: "md",
            paddingAll: "md",
            contents: [
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "假別", color: "#9CA3AF", size: "xs", flex: 2 },
                        { type: "text", text: data.leaveType, wrap: true, color: "#4B5563", size: "sm", flex: 5, weight: "bold" }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "日期", color: "#9CA3AF", size: "xs", flex: 2 },
                        { type: "text", text: data.date, wrap: true, color: "#4B5563", size: "sm", flex: 5 }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "事由", color: "#9CA3AF", size: "xs", flex: 2 },
                        { type: "text", text: data.reason, wrap: true, color: "#374151", size: "sm", flex: 5 }
                    ]
                }
            ]
        }
    ];

    // Condition: Only show proof button if NOT '事假'
    if (data.leaveType !== '事假') {
        bodyContents.push({
            type: "button",
            action: { type: "uri", label: "📎 查看證明文件", uri: proofUrl || "https://line.me" },
            style: "link",
            height: "sm",
            color: "#4F46E5",
            margin: "sm"
        });
    }

    // FIX: Clean JSON structure to prevent syntax errors
    const flexMessage = {
        type: "flex",
        altText: "📋 您有一筆新的請假申請待審核",
        contents: {
            type: "bubble",
            size: "mega",
            body: {
                type: "box",
                layout: "vertical",
                contents: bodyContents
            },
            footer: {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        backgroundColor: "#ffc9c9",
                        cornerRadius: "md",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "40px",
                        action: {
                            type: "postback",
                            label: "駁回",
                            data: JSON.stringify({ action: "reject", ts: timestamp, uid: data.uid, name: data.name, date: data.date }),
                        },
                        contents: [
                            {
                                type: "text",
                                text: "駁回",
                                color: "#fc6161ff",
                                size: "sm",
                                align: "center"
                            }
                        ]
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        backgroundColor: "#c3fae8",
                        cornerRadius: "md",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "40px",
                        action: {
                            type: "postback",
                            label: "核准",
                            data: JSON.stringify({ action: "approve", ts: timestamp, uid: data.uid, name: data.name, date: data.date })
                        },
                        contents: [
                            {
                                type: "text",
                                text: "核准",
                                color: "#12b886",
                                size: "sm",
                                align: "center"
                            }
                        ]
                    }
                ]
            },
            styles: {
                footer: { separator: false }
            }
        }
    };

    const resp = await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
        },
        body: JSON.stringify({
            to: supervisors,
            messages: [flexMessage]
        })
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`LINE 通知發送失敗: ${errText}`);
    }
}

async function handlePostback(event, env) {
    const data = JSON.parse(event.postback.data);
    const token = await getAccessToken(env);

    const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:K', token);
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === data.ts && rows[i][2] === data.uid) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex > -1) {
        const status = data.action === 'approve' ? 'Approved' : 'Rejected';
        await updateSheetCell(env.SHEET_ID, `Leave_Records!K${rowIndex}`, status, token);

        await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
            },
            body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: `已${status === 'Approved' ? '核准' : '駁回'} ${data.name} 的申請` }]
            })
        });

        await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
            },
            body: JSON.stringify({
                to: data.uid,
                messages: [{ type: 'text', text: `您的假單 (${data.name})-${data.date} 已${status === 'Approved' ? '核准' : '駁回'}` }]
            })
        });
    }
}

async function handleFollow(event, env) {
    const welcomeMsg = {
        type: "text",
        text: "歡迎使用204府城大師請假系統！\n\n請點擊下方連結進入系統進行綁定與請假：\nhttps://liff.line.me/2008645610-0MezRE9Z"
    };

    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
        },
        body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [welcomeMsg]
        })
    });
}

async function handleMessage(event, env) {
    const quickReply = {
        type: "text",
        text: "請選擇服務：",
        quickReply: {
            items: [
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📝 請假申請",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?tab=apply"
                    }
                },
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📋 我的紀錄",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?tab=my_records"
                    }
                }
            ]
        }
    };

    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
        },
        body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [quickReply]
        })
    });
}

