<template>
  <div class="flex flex-col h-full animate-fade-in">
    <!-- Header -->
    <div class="mb-6 relative text-center">
      <button
        @click="$emit('back')"
        class="absolute left-0 top-1 text-gray-400 hover:text-gray-600"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </button>
      <h1 class="text-2xl font-bold text-gray-900">開案/開發申請</h1>
      <button
        @click="showHelp = true"
        class="absolute right-0 top-1 text-gray-400 hover:text-indigo-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>

    <!-- Tabs (All Roles) -->
    <div class="mb-4">
      <div v-if="isSupervisor" class="flex items-center justify-center space-x-2 mb-2">
        <span
          class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
          >{{ user.role }}</span
        >
        <span
          class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full"
          >{{ user.unit }}</span
        >
      </div>
      <div class="flex space-x-2 bg-gray-100 p-1 rounded-lg">
        <button
          @click="activeTab = 'apply'"
          :class="
            activeTab === 'apply'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium rounded-md transition"
        >
          📝 填寫申請
        </button>
        
        <!-- Supervisor: Review Tab -->
        <button
          v-if="isSupervisor"
          @click="
            activeTab = 'review';
            fetchCases();
          "
          :class="
            activeTab === 'review'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium rounded-md transition relative"
        >
          📋 審核案件
          <span
            v-if="pendingCases.length > 0"
            class="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"
          ></span>
        </button>

        <!-- Staff: Records Tab -->
        <button
          v-else
          @click="
            activeTab = 'records';
            fetchCases();
          "
          :class="
            activeTab === 'records'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium rounded-md transition"
        >
          📂 申請紀錄
        </button>

        <button
          v-if="isSupervisor"
          @click="
            activeTab = 'ranking';
            fetchRanking();
          "
          :class="
            activeTab === 'ranking'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium rounded-md transition"
        >
          🏆 排行榜
        </button>
      </div>
    </div>

    <!-- Review View (Supervisor) -->
    <div
      v-if="activeTab === 'review'"
      class="flex-1 overflow-y-auto space-y-4 pb-10"
    >
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-white border border-green-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
             <div class="flex justify-between items-start mb-2">
                 <Skeleton width="100px" height="1.25rem" />
                 <Skeleton width="60px" height="1rem" borderRadius="999px" />
             </div>
             <Skeleton width="150px" height="0.8rem" class="mb-2" />
             <div class="grid grid-cols-2 gap-4 mt-2">
                 <Skeleton height="2rem" />
                 <Skeleton height="2rem" />
             </div>
        </div>
      </div>
      <div
        v-else-if="pendingCases.length === 0"
        class="text-center py-8 text-gray-400"
      >
        沒有待審核案件
      </div>
      <div
        v-for="c in pendingCases"
        :key="c.timestamp"
        class="bg-white border border-green-100 rounded-xl p-4 shadow-sm relative overflow-hidden"
      >
        <div class="absolute top-0 left-0 w-1 h-full" :class="c.status === CASE_STATUS.PROCESSING ? 'bg-yellow-400' : 'bg-green-500'"></div>
        <div class="flex justify-between items-start mb-2 pl-2">
          <div>
            <h3 class="font-bold text-gray-900 text-lg">{{ c.applicant }}</h3>
            <span class="text-xs text-gray-500 block"
              >{{ c.timestamp.split("T")[0] }} • {{ c.agency }}</span
            >
          </div>
          <span
            class="text-xs px-2 py-1 rounded-full font-medium"
            :class="c.status === CASE_STATUS.PROCESSING ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'"
            >{{ c.status === CASE_STATUS.PROCESSING ? '受理中' : c.applyTypes }}</span
          >
        </div>

        <div class="pl-2 mb-3 space-y-1 text-sm text-gray-700">
          <p>
            <span class="font-bold text-gray-500 text-xs uppercase">個案</span>
            {{ c.caseName }} ({{ c.gender }})
          </p>
          <p>
            <span class="font-bold text-gray-500 text-xs uppercase">區域</span>
            {{ c.area }}
          </p>
          <p v-if="c.status === CASE_STATUS.PROCESSING && c.firstServiceDate">
              <span class="font-bold text-gray-500 text-xs uppercase">首次服務日</span>
              {{ c.firstServiceDate }}
          </p>
        </div>

        <div class="flex space-x-2 pt-2 border-t border-gray-100 pl-2">
          <!-- Pending: Show Accept -->
          <button
            v-if="c.status === CASE_STATUS.PENDING"
            @click="openAcceptModal(c)"
            class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium shadow"
          >
            受理
          </button>
          
          <!-- Processing: Show Approve (Check Maturity) -->
          <button
            v-else-if="c.status === CASE_STATUS.PROCESSING"
            @click="reviewCase(c, 'approve')"
            :disabled="getDaysRemaining(c.firstServiceDate) > 0"
            class="flex-1 py-2 rounded-lg text-sm font-medium shadow transition-colors"
            :class="getDaysRemaining(c.firstServiceDate) > 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white'"
          >
            {{ getDaysRemaining(c.firstServiceDate) > 0 ? `核准 (剩 ${getDaysRemaining(c.firstServiceDate)} 天)` : '核准' }}
          </button>
          
          <button
            @click="openRejectModal(c)"
            class="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
          >
            駁回
          </button>
        </div>
      </div>
    </div>

    <!-- Application Form -->
    <form
      v-else-if="activeTab === 'apply'"
      @submit.prevent="submit"
      class="space-y-4 flex-1 overflow-y-auto pb-10"
    >
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >申請人</label
          >
          <input
            type="text"
            :value="user.name"
            disabled
            class="w-full bg-gray-100 rounded-lg border-gray-300 py-2 px-3 border text-gray-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >員工編號 <span class="text-red-500">*</span></label
          >
          <input
            type="text"
            v-model="form.staffId"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >所屬機構 <span class="text-red-500">*</span></label
          >
          <select
            v-model="form.agency"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border bg-white"
          >
            <option
              v-for="opt in ['府城', '鴻康', '謙益', '寬澤']"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >個案區域 <span class="text-red-500">*</span></label
          >
          <select
            v-model="form.area"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border bg-white"
          >
            <option
              v-for="opt in [
                '東區',
                '南區',
                '中西區',
                '北區',
                '安平區',
                '安南區',
                '安定區',
                '永康區',
                '新市區',
                '新化區',
                '歸仁區',
                '仁德區',
              ]"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >個案姓名 <span class="text-red-500">*</span></label
        >
        <input
          type="text"
          v-model="form.caseName"
          required
          class="w-full rounded-lg border-gray-300 py-2 px-3 border"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"
          >性別 <span class="text-red-500">*</span></label
        >
        <div class="flex space-x-6">
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.gender"
              value="男"
              class="text-green-600 mr-2"
            />
            男</label
          >
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.gender"
              value="女"
              class="text-green-600 mr-2"
            />
            女</label
          >
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"
          >申請類別 <span class="text-red-500">*</span></label
        >
        <div class="flex space-x-6">
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.applyType"
              value="開案"
              class="text-green-600 mr-2"
            />
            開案</label
          >
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.applyType"
              value="開發"
              class="text-green-600 mr-2"
            />
            開發</label
          >
        </div>
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full btn-primary !bg-gradient-to-r !from-green-500 !to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50"
      >
        {{ submitting ? "送出中..." : "送出申請" }}
      </button>
    </form>

    <!-- Staff Records View -->
    <div v-else-if="activeTab === 'records'" class="flex-1 overflow-y-auto space-y-4 pb-10">
        <div v-if="loading" class="space-y-4">
             <div v-for="i in 3" :key="i" class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center space-x-4">
                <Skeleton width="40px" height="40px" borderRadius="10px" />
                <div class="flex-1 space-y-2">
                    <Skeleton width="100px" height="1rem" />
                    <Skeleton width="100%" height="0.5rem" />
                </div>
             </div>
        </div>
        <div v-else-if="myCases.length === 0" class="text-center py-8 text-gray-400">
             尚無申請紀錄
        </div>
        <div v-else v-for="c in myCases" :key="c.timestamp" class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
             <!-- Status Stripe -->
             <div class="absolute top-0 left-0 w-1 h-full" 
                  :class="c.status === CASE_STATUS.APPROVED ? 'bg-green-500' : c.status === CASE_STATUS.REJECTED ? 'bg-red-500' : 'bg-yellow-400'">
             </div>
             
             <div class="pl-2">
                 <div class="flex justify-between items-start mb-2">
                     <div>
                         <h3 class="font-bold text-gray-800 text-lg">{{ c.caseName }}</h3>
                         <span class="text-xs text-gray-500">{{ c.timestamp.split('T')[0] }}</span>
                     </div>
                     <span class="text-xs px-2 py-1 rounded-full font-bold"
                           :class="c.status === CASE_STATUS.APPROVED ? 'bg-green-100 text-green-800' : c.status === CASE_STATUS.REJECTED ? 'bg-red-100 text-red-800' : c.status === CASE_STATUS.PROCESSING ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'">
                         {{ c.status === CASE_STATUS.APPROVED ? '已核准' : c.status === CASE_STATUS.REJECTED ? '已駁回' : c.status === CASE_STATUS.PROCESSING ? '受理中' : '審核中' }}
                     </span>
                 </div>
                 
                 <div class="space-y-1 text-sm text-gray-600">
                     <p><span class="font-bold">區域：</span>{{ c.area }}</p>
                     <p><span class="font-bold">類別：</span>{{ c.applyTypes }}</p>
                     <div v-if="c.reviewer" class="mt-2 text-xs bg-gray-50 p-2 rounded">
                        <span class="font-bold text-gray-500">審核人：</span>{{ c.reviewer }}
                        <span class="ml-2 text-gray-400">{{ c.reviewTime?.split('T')[0] }}</span>
                     </div>
                     
                     <!-- Reject Reason -->
                     <div v-if="c.status === CASE_STATUS.REJECTED && c.rejectReason" class="mt-2 text-xs bg-red-50 p-2 rounded border border-red-100">
                        <span class="font-bold text-red-800">駁回原因：</span>
                        <p class="text-red-700 mt-1">{{ c.rejectReason }}</p>
                     </div>
                     
                     <!-- 8-Week Progress Bar (Only for PROCESSING) -->
                     <div v-if="c.status === CASE_STATUS.PROCESSING && c.firstServiceDate" class="mt-3">
                        <div class="flex justify-between text-xs mb-1">
                           <span class="text-gray-500">開案進度 (8週)</span>
                           <span class="font-bold text-green-600">{{ getProgress(c.firstServiceDate) }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                           <div class="bg-green-500 h-2 rounded-full transition-all duration-1000" :style="{ width: getProgress(c.firstServiceDate) + '%' }"></div>
                        </div>
                        <p class="text-xs text-right text-gray-400 mt-1">剩餘 {{ getDaysRemaining(c.firstServiceDate) }} 天</p>
                     </div>
                     
                     <p v-if="c.status === CASE_STATUS.PROCESSING && c.firstServiceDate && !c.reviewer" class="mt-2 text-xs text-gray-400">
                        首次服務日: {{ c.firstServiceDate }}
                     </p>
                 </div>
             </div>
        </div>
    </div>

    <!-- Ranking View -->
    <div
      v-if="activeTab === 'ranking'"
      class="flex-1 overflow-y-auto pb-10 space-y-4"
    >
      <!-- Filter -->
      <div class="bg-gray-50 p-2 rounded-lg flex justify-center">
         <select v-model="rankingFilter" class="bg-white border text-sm border-gray-300 text-gray-700 py-1 px-3 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
             <option value="staff">居服員排行</option>
             <option value="supervisor">督導/業負排行</option>
         </select>
      </div>

       <div v-if="loading" class="space-y-4">
         <div v-for="i in 3" :key="i" class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center space-x-4">
            <Skeleton width="40px" height="40px" borderRadius="10px" />
            <div class="flex-1 space-y-2">
                <Skeleton width="100px" height="1rem" />
                <Skeleton width="100%" height="0.5rem" />
            </div>
         </div>
       </div>

      <div v-else class="space-y-6"> 
          <!-- Opening Ranking -->
          <div class="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
              <h3 class="font-bold text-green-800 mb-4 flex items-center">
                <span class="mr-2 text-xl">💰</span> 開案排行榜
              </h3>
              <div v-if="currentRanking.byOpening.length === 0" class="text-center text-gray-400 py-4">尚無資料</div>
              <div v-else class="space-y-4">
                  <div v-for="(item, idx) in currentRanking.byOpening" :key="'op'+idx" class="flex items-center">
                      <div 
                        class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm flex-none mr-3"
                        :class="idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-orange-300' : 'bg-green-100 text-green-800'"
                      >
                          {{ idx + 1 }}
                      </div>
                      <div class="flex-1">
                          <div class="flex justify-between items-end mb-1">
                              <span class="font-medium text-gray-800">{{ item.name }}</span>
                              <span class="font-bold text-green-600">{{ item.opening }} 案</span>
                          </div>
                          <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div class="bg-green-500 h-2 rounded-full animate-bar" :style="{ width: (item.opening / (currentRanking.byOpening[0].opening || 1)) * 100 + '%' }"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Development Ranking -->
          <div class="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
              <h3 class="font-bold text-blue-800 mb-4 flex items-center">
                <span class="mr-2 text-xl">📈</span> 開發排行榜
              </h3>
              <div v-if="currentRanking.byDev.length === 0" class="text-center text-gray-400 py-4">尚無資料</div>
              <div v-else class="space-y-4">
                  <div v-for="(item, idx) in currentRanking.byDev" :key="'dev'+idx" class="flex items-center">
                       <div 
                        class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm flex-none mr-3"
                        :class="idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-orange-300' : 'bg-blue-100 text-blue-800'"
                      >
                          {{ idx + 1 }}
                      </div>
                      <div class="flex-1">
                          <div class="flex justify-between items-end mb-1">
                              <span class="font-medium text-gray-800">{{ item.name }}</span>
                              <span class="font-bold text-blue-600">{{ item.development }} 筆</span>
                          </div>
                          <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div class="bg-blue-500 h-2 rounded-full animate-bar" :style="{ width: (item.development / (currentRanking.byDev[0].development || 1)) * 100 + '%' }"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>

    <!-- Help Modal -->
    <div
      v-if="showHelp"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        class="bg-white w-full max-w-sm rounded-xl shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        <!-- Header (Fixed) -->
        <div class="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
             <h3 class="font-bold text-lg text-gray-800">獎金說明</h3>
             <button
               @click="showHelp = false"
               class="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50"
             >
               ✕
             </button>
        </div>

        <!-- Content (Scrollable) -->
        <div class="p-5 overflow-y-auto space-y-4 text-sm text-gray-600">
          <div class="bg-green-50 p-4 rounded-lg border border-green-100">
            <h4 class="font-bold text-green-800 mb-2 flex items-center">
                <span class="mr-2">💰</span> 開案獎金
            </h4>
            <div class="text-sm text-green-900 space-y-2 leading-relaxed">
                <p>開發或介紹個案公司服務，該個案實際服務滿八週後，即可累積一案。</p>
                <p>於簽訂契約日起算至滿一年時，計算一年內的介紹和開發案件總數。</p>
                <ul class="list-disc pl-5 font-bold space-y-1 mt-2 bg-white/50 p-2 rounded">
                    <li>第一案： 3,000元</li>
                    <li>第二案： 3,500元</li>
                    <li>第三案： 4,000元</li>
                    <li>第四案： 4,500元</li>
                    <li>第五案以上：每案 5,000元</li>
                </ul>
            </div>
          </div>
          
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 class="font-bold text-blue-800 mb-2 flex items-center">
                <span class="mr-2">📈</span> 開發獎金
            </h4>
            <div class="text-sm text-blue-900 space-y-2 leading-relaxed">
                <p>三個月計算一次，每年 2、5、8、11 月發放。</p>
                <div class="bg-white/50 p-2 rounded border border-blue-200">
                    <p class="font-bold mb-1">計算公式：</p>
                    <p>開發獎金 = (該月變更計畫後額度 - 初始計畫額度) × 0.08</p>
                </div>
                <p>計算已實際服務月數最多為3個月，為同仁該季額度開發獎金，該項獎金為一次性發放。</p>
                
                <div class="mt-3 text-xs bg-white/60 p-3 rounded space-y-2">
                    <p><span class="font-bold border-b border-blue-300">例如 1：</span><br>11月份新增開發 1000元 × 0.08= 80元<br>(此為11月開發獎金，12月與1月一樣方式計算總計，發放時間為2月)</p>
                    <p><span class="font-bold border-b border-blue-300">例如 2：</span><br>1月份新增開發 1000 × 0.08 = 80元<br>(此為1月開發獎金，發放時間為2月，2月與3月開發獎金發放時間為5月)</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Accept Modal (Date Picker) -->
     <div v-if="showAcceptModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white w-full max-w-xs rounded-xl shadow-xl p-6">
              <h3 class="font-bold text-lg mb-4 text-gray-900">請輸入首次服務日</h3>
              <input type="date" v-model="acceptDate" class="w-full border border-gray-300 rounded-lg p-2 mb-4">
              <div class="flex space-x-2">
                  <button @click="confirmAccept" class="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold shadow">確認受理</button>
                  <button @click="showAcceptModal = false" class="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold">取消</button>
              </div>
          </div>
     </div>
     
     <!-- Reject Modal -->
     <div v-if="showRejectModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white w-full max-w-xs rounded-xl shadow-xl p-6">
              <h3 class="font-bold text-lg mb-2 text-gray-900">確定駁回此案件？</h3>
              <p class="text-xs text-gray-500 mb-4">請輸入駁回原因以便申請人修正</p>
              <textarea v-model="rejectReason" class="w-full border border-gray-300 rounded-lg p-2 mb-4 h-24 resize-none" placeholder="請輸入駁回原因..."></textarea>
              <div class="flex space-x-2">
                  <button @click="confirmReject" class="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold shadow">確認駁回</button>
                  <button @click="showRejectModal = false" class="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold">取消</button>
              </div>
          </div>
     </div>
   </div>
 </template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import Skeleton from "./Skeleton.vue";
import { CASE_STATUS, ROLES } from "../constants/common.js";

const props = defineProps(["user"]);
const emit = defineEmits(["back"]);

const activeTab = ref("apply");
const submitting = ref(false);
const loading = ref(false);
const showHelp = ref(false);
const pendingCases = ref([]); // For Supervisor
const myCases = ref([]); // For Staff


const isSupervisor = computed(() =>
  ROLES.SUPERVISOR_ROLES.includes(props.user.role)
);

const form = reactive({
  staffId: "",
  agency: "",
  area: "",
  caseName: "",
  gender: "",
  applyType: "",
});

const submit = async () => {
  if (
    !form.staffId ||
    !form.agency ||
    !form.area ||
    !form.caseName ||
    !form.gender ||
    !form.applyType
  ) {
    return alert("請填寫完整");
  }
  submitting.value = true;
  try {
    const res = await fetch("/api/submit-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        uid: props.user.uid,
        applicant: props.user.name,
        applyTypes: [form.applyType],
      }),
    });
    if ((await res.json()).success) {
      alert("申請已送出");
      Object.assign(form, {
        agency: "",
        area: "",
        caseName: "",
        gender: "",
        applyType: "",
      });
    } else alert("失敗");
  } catch (e) {
    alert("Error");
  }
  submitting.value = false;
};

const showAcceptModal = ref(false);
const acceptDate = ref('');
const targetCase = ref(null);

const openAcceptModal = (c) => {
    targetCase.value = c;
    acceptDate.value = new Date().toISOString().split('T')[0];
    showAcceptModal.value = true;
};

const confirmAccept = async () => {
    if(!acceptDate.value) return alert('請選擇日期');
    await reviewCase(targetCase.value, 'accept', acceptDate.value);
    showAcceptModal.value = false;
};

const showRejectModal = ref(false);
const rejectReason = ref('');

const openRejectModal = (c) => {
    targetCase.value = c;
    rejectReason.value = '';
    showRejectModal.value = true;
};

const confirmReject = async () => {
    if(!rejectReason.value) return alert('請輸入駁回原因');
    await reviewCase(targetCase.value, 'reject', null, rejectReason.value);
    showRejectModal.value = false;
};

const getDaysRemaining = (firstServiceDate) => {
    if(!firstServiceDate) return 56;
    const start = new Date(firstServiceDate);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 56 - diff);
};

const getProgress = (firstServiceDate) => {
    if(!firstServiceDate) return 0;
    const daysRemaining = getDaysRemaining(firstServiceDate);
    const elapsed = 56 - daysRemaining;
    const percent = Math.floor((elapsed / 56) * 100);
    return Math.min(100, Math.max(0, percent));
};

const fetchCases = async () => {
  loading.value = true;
  try {
    const res = await fetch("/api/get-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: props.user.uid, unit: props.user.unit }),
    });
    const data = await res.json();

    // Also fetch PROCESSING cases for reviewer
    if (isSupervisor.value) {
        pendingCases.value = data.cases
        ? data.cases.filter((c) => c.status === CASE_STATUS.PENDING || c.status === CASE_STATUS.PROCESSING)
        : [];
    } else {
        // Staff: Show all my cases sorted by date desc
        myCases.value = data.cases ? data.cases.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const rankingFilter = ref('staff'); // staff, supervisor
const rankingData = ref({ staff: { byOpening: [], byDev: [] }, supervisor: { byOpening: [], byDev: [] } });

const currentRanking = computed(() => {
    return rankingData.value[rankingFilter.value] || { byOpening: [], byDev: [] };
});

const fetchRanking = async () => {
   loading.value = true;
   try {
     const res = await fetch("/api/get-case-ranking", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ uid: props.user.uid }) 
     });
     const data = await res.json();
     if(data.success) {
         rankingData.value = data.rankings;
     }
   } catch(e) {
       console.error(e);
   } finally {
       loading.value = false;
   }
};

const reviewCase = async (c, action, dateString = null, reason = null) => {
  if (action === 'approve' && !confirm(`確定核准?`)) return; // Only confirm for approve, modals for others logic handle themselves (wait, accept has modal too)
  // Actually, accept/reject have their own modals now, so we can remove generic confirm for them.
  // Or just keep it simple. The modals call this function directly. 
  // Let's remove the confirm if it's coming from a modal action (accept/reject).
  // But wait, the button calls 'approve' directly.
  
  if (action === 'approve') {
       if(!confirm('確定核准?')) return;
  }
  
  try {
    const res = await fetch("/api/review-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: props.user.uid,
        reviewerName: props.user.name,
        timestamp: c.timestamp,
        action: action,
        firstServiceDate: dateString,
        rejectReason: reason
      }),
    });
    if ((await res.json()).success) {
      alert("已更新");
      fetchCases();
    } else alert("失敗");
  } catch (e) {
    alert("Error");
  }
};

onMounted(() => {
  if (isSupervisor.value) {
    // activeTab.value = 'review';
    fetchCases();
  }
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes grow-bar {
  from {
    width: 0;
  }
}
.animate-bar {
  animation: grow-bar 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
</style>
