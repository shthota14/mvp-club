import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mvpclub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401 — but NOT for auth endpoints (login failures are expected 401s)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('mvpclub_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/auth/me', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

// Ideas
export const ideasApi = {
  list: () => api.get('/ideas'),
  create: (data: Record<string, unknown>) => api.post('/ideas', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/ideas/${id}`, data),
  getEntries: (id: string, stage?: string) => api.get(`/ideas/${id}/entries`, { params: { stage } }),
  upsertEntry: (id: string, data: Record<string, unknown>) => api.put(`/ideas/${id}/entries`, data),
};

// Validation
export const validationApi = {
  listContacts: (ideaId: string, source?: string) =>
    api.get('/validation/contacts', { params: { idea_id: ideaId, source } }),
  addContact: (data: Record<string, unknown>) => api.post('/validation/contacts', data),
  updateContact: (id: string, data: Record<string, unknown>) => api.patch(`/validation/contacts/${id}`, data),
  deleteContact: (id: string) => api.delete(`/validation/contacts/${id}`),
  getStats: (ideaId: string) => api.get(`/validation/stats/${ideaId}`),
  getMeetings: (ideaId: string) => api.get('/validation/contacts/meetings', { params: { idea_id: ideaId } }),
  requestMeeting: (contactId: string, data: { duration_mins?: number; problem?: string }) =>
    api.post(`/validation/contacts/${contactId}/request-meeting`, data),
  bulkRequestMeeting: (data: { contact_ids: string[]; duration_mins?: number; problem?: string }) =>
    api.post('/validation/contacts/bulk-request-meeting', data),
  ideaReact: (data: { question: string; answer: string }) =>
    api.post('/validation/idea/react', data),
  assembleOneLiner: (data: { building: string; audience: string; struggle: string; outcome: string }) =>
    api.post('/validation/idea/assemble-one-liner', data),
  // Idea Step 1 — AI-drafted domain + rough TAM/SAM + short competitor list,
  // once the one-liner is complete. See the caveat comment above
  // generateMarketSnapshot in the backend before changing this — the model
  // has no live market data and can name a fabricated competitor with full
  // confidence, so the frontend always labels this as an AI draft to verify.
  marketSnapshot: (data: { ideaName?: string; oneLiner?: string }) =>
    api.post('/validation/idea/market-snapshot', data),
  checkQuestion: (data: { question: string; hint?: string }) =>
    api.post('/validation/questions/check', data),
  generateChips: (data: { question: string; hint?: string; problemDomain?: string }) =>
    api.post('/validation/questions/generate-chips', data),
  generateScript: (data: {
    problem?: string;
    persona?: string;
    assumptions?: string[];
    icpJobs?: string;
    icpFrustrations?: string;
    icpAlternatives?: string;
    keyQuestion?: string;
  }) => api.post('/validation/questions/generate-script', data),
  generateGuide: (data: {
    ideaName?: string;
    oneLiner?: string;
    whoExactly?: string;
    problemSentence?: string;
    painIfNothing?: string;
    frequency?: string;
    solutionAlternatives?: string;
    whoPays?: string;
    founderStatement?: string;
    icpJobs?: string;
    icpFrustrations?: string;
    icpAlternatives?: string;
    assumptions?: string[];
    // Set on "Ask Sage for more questions" so the AI avoids repeating
    // questions from the guide already generated in an earlier call.
    existingQuestions?: string[];
  }) => api.post('/validation/questions/generate-guide', data),
  generateMvpHypothesis: (data: {
    oneLiner?: string;
    validatedProblem?: string;
    persona?: string;
    confirmedPains?: string[];
    keyInsights?: string[];
    learnings?: string[];
    surprises?: string[];
    demandSignalCount?: number;
  }) => api.post('/validation/shape/generate-hypothesis', data),
  suggestFeatures: (data: {
    oneLiner?: string;
    simplestVersion?: string;
    validatedProblem?: string;
    persona?: string;
    confirmedPains?: string[];
    confirmedInsights?: string[];
    surprisingInsights?: string[];
    bustedInsights?: string[];
    demandSignalCount?: number;
    communityFeedback?: string[];
  }) => api.post('/validation/shape/suggest-features', data),
  checkFeatures: (data: {
    features: string[];
    oneLiner?: string;
    simplestVersion?: string;
    validatedProblem?: string;
    persona?: string;
    confirmedPains?: string[];
    confirmedInsights?: string[];
    surprisingInsights?: string[];
    bustedInsights?: string[];
    demandSignalCount?: number;
    communityFeedback?: string[];
  }) => api.post('/validation/shape/check-features', data),
  suggestChannels: (data: {
    ideaId?: string;
    oneLiner?: string;
    validatedProblem?: string;
    persona?: string;
  }) => api.post('/validation/shape/suggest-channels', data),
  suggestPricing: (data: {
    oneLiner?: string;
    validatedProblem?: string;
    persona?: string;
    whoPays?: string;
    quantifiedValue?: string;
    demandSignalCount?: number;
  }) => api.post('/validation/shape/suggest-pricing', data),
  checkPricing: (data: {
    revenueModel: string[];
    pricePoint: string;
    oneLiner?: string;
    validatedProblem?: string;
    persona?: string;
    whoPays?: string;
    quantifiedValue?: string;
    demandSignalCount?: number;
  }) => api.post('/validation/shape/check-pricing', data),
  // Ship Step 1 — "Build My MVP". Assembles the founder's validated
  // journey (Hone → Validate → Shape) into a single AI-generated Build
  // Specification that every later Ship step is generated from.
  generateBuildSpec: (data: {
    ideaName?: string;
    oneLiner?: string;
    validatedProblem?: string;
    persona?: string;
    productType?: string[];
    mvpHypothesis?: string;
    features?: string[];
    outOfScope?: string[];
    buildApproach?: string;
    distribution?: string[];
    revenueModel?: string[];
    pricePoint?: string;
    payer?: string;
  }) => api.post('/validation/ship/build-spec', data),
  // Ship Step 2 — "Choose how you want to build". Recommends app-builder /
  // coding-env / dev-handoff based on Build Spec complexity + the founder's
  // self-reported coding comfort. Specific tool names/pricing are a static
  // list on the frontend, not generated here.
  recommendBuildPath: (data: {
    featureCount?: number;
    integrationsCount?: number;
    appType?: string;
    database?: string;
    authentication?: string;
    payments?: string;
    buildApproach?: string;
    technicalConfidence?: string;
  }) => api.post('/validation/ship/build-path', data),
  // Ship Step 3 — "Map your user flows & screens". Turns the accepted Build
  // Spec's feature list into primary user journeys + a screen inventory,
  // each screen mapped back to the feature(s) it serves. Feeds directly
  // into the UI Prompt Generator (P0-4).
  generateFlowsAndScreens: (data: {
    ideaName?: string;
    featureList?: string[];
    coreUserJourney?: string[];
    appType?: string;
    authentication?: string;
    payments?: string;
  }) => api.post('/validation/ship/flows-screens', data),
  // Ship Step 4 — "Generate your UI prompts". One implementation-ready
  // coding prompt per screen (role, product context, target user, screen
  // purpose + CTA, required components, empty/loading/error states,
  // responsive, accessibility, no-scope-creep, acceptance criteria).
  generateUIPrompt: (data: {
    ideaName?: string;
    validatedProblem?: string;
    persona?: string;
    appType?: string;
    authentication?: string;
    payments?: string;
    outOfScope?: string[];
    screenName: string;
    screenPurpose: string;
    screenCategory: string;
    screenFeatures: string[];
  }) => api.post('/validation/ship/ui-prompt', data),
  // Ship Step 6 — "Build your features". One Build Card per feature (user
  // story, why it matters, UI/user flow, data & business logic, edge cases,
  // acceptance criteria). The coding prompt and QA prompt are assembled
  // client-side from the card, not generated by this call.
  generateFeatureBuildCard: (data: {
    ideaName?: string;
    featureName: string;
    featureList?: string[];
    validatedProblem?: string;
    persona?: string;
    appType?: string;
    outOfScope?: string[];
  }) => api.post('/validation/ship/feature-build-card', data),
  // Ship Step 7 — "Describe your next change" (Vibe Coding Coach). Turns a
  // founder's plain-language change request (tagged with a change
  // category) into an implementation-ready coding prompt for an existing
  // MVP. Called once per change request from the frontend.
  generateChangeCodingPrompt: (data: {
    ideaName?: string;
    validatedProblem?: string;
    persona?: string;
    appType?: string;
    featureList?: string[];
    outOfScope?: string[];
    category: string;
    description: string;
  }) => api.post('/validation/ship/vibe-coach', data),
};

// Founder availability (weekly recurring hours for meeting scheduling)
export const availabilityApi = {
  get: () => api.get('/availability'),
  save: (data: {
    rules: { day_of_week: number; start_time: string; end_time: string }[];
    timezone: string;
    min_notice_hours: number;
    booking_window_days: number;
    buffer_mins: number;
  }) => api.put('/availability', data),
  // Per-date overrides layered on top of the weekly pattern above -- start/end
  // are 'YYYY-MM-DD'. An override date can have zero windows (explicitly blocked).
  getOverrides: (start: string, end: string) =>
    api.get('/availability/overrides', { params: { start, end } }),
  saveOverride: (date: string, windows: { start_time: string; end_time: string }[]) =>
    api.put(`/availability/overrides/${date}`, { windows }),
  clearOverride: (date: string) =>
    api.delete(`/availability/overrides/${date}`),
};

// Public slot booking (no auth — used by the /book/:token page a contact opens from their email)
export const bookingApi = {
  get: (token: string) => api.get(`/book/${token}`),
  confirm: (token: string, startTimeIso: string) => api.post(`/book/${token}`, { start_time: startTimeIso }),
};

// Community
export const communityApi = {
  // idea feed
  listIdeas: (stage?: string) => api.get('/community/ideas', { params: { stage } }),
  getIdea: (ideaId: string) => api.get(`/community/ideas/${ideaId}`),
  getIdeaPosts: (ideaId: string) => api.get(`/community/ideas/${ideaId}/posts`),
  addIdeaPost: (ideaId: string, data: Record<string, unknown>) => api.post(`/community/ideas/${ideaId}/posts`, data),
  bookmarkIdea: (ideaId: string) => api.post(`/community/ideas/${ideaId}/bookmark`),
  followIdea: (ideaId: string) => api.post(`/community/ideas/${ideaId}/follow`),
  reactToPost: (postId: string, type: 'encourage' | 'ask') => api.post(`/community/posts/${postId}/react`, { type }),
  editPost: (postId: string, content: string) => api.patch(`/community/posts/${postId}`, { content }),
  // messaging
  getOrCreateConversation: (userId: string, ideaId?: string) =>
    api.get(`/community/messages/with/${userId}`, { params: { idea_id: ideaId } }),
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/community/messages/${conversationId}`, { content }),
  listConversations: () => api.get('/community/messages'),
  getIdeaCanvas: (ideaId: string) => api.get(`/community/ideas/${ideaId}/canvas`),
  getIdeaSummary: (ideaId: string) => api.get(`/community/ideas/${ideaId}/summary`),
  getPublicSections: (ideaId: string) => api.get(`/community/ideas/${ideaId}/public-sections`),
  offerNetwork: (ideaId: string, data: Record<string, unknown>) => api.post(`/community/ideas/${ideaId}/network-offers`, data),
  getNetworkOffers: (ideaId: string) => api.get(`/community/ideas/${ideaId}/network-offers`),
  // legacy
  listPosts: (stage?: string) => api.get('/community/posts', { params: { stage } }),
  createPost: (data: Record<string, unknown>) => api.post('/community/posts', data),
  react: (postId: string, type: 'encourage' | 'ask' | 'pursue' | 'interest') => api.post(`/community/posts/${postId}/react`, { type }),
  getComments: (postId: string) => api.get(`/community/posts/${postId}/comments`),
  addComment: (postId: string, content: string) => api.post(`/community/posts/${postId}/comments`, { content }),
  // pain points
  listPainPoints: () => api.get('/community/pain-points'),
  // collabs
  listCollabs: () => api.get('/community/collabs'),
  // early-stage funding news (real headlines, AI-curated — see backend/src/utils/startupNewsFeed.ts)
  listStartupNews: () => api.get('/community/startup-news'),
  refreshStartupNews: () => api.post('/community/startup-news/refresh'),
  // community polls — any member can create, one vote per person, auto-closes after 7 days
  listPolls: () => api.get('/community/polls'),
  createPoll: (question: string, options: string[]) => api.post('/community/polls', { question, options }),
  votePoll: (pollId: string, optionIndex: number) => api.post(`/community/polls/${pollId}/vote`, { option_index: optionIndex }),
};

// Surveys
export const surveysApi = {
  create: (data: { idea_id: string; title: string; description?: string; questions: string[] }) =>
    api.post('/surveys', data),
  getByToken: (token: string) => api.get(`/surveys/${token}`),
  getByIdea: (ideaId: string) => api.get(`/surveys`, { params: { idea_id: ideaId } }),
};

// LinkedIn OAuth
export const linkedinApi = {
  init: () => api.get('/linkedin/init'),
  status: () => api.get('/linkedin/status'),
  disconnect: () => api.delete('/linkedin/disconnect'),
};

// Zoom OAuth (per-user -- each idea originator connects their own account so
// their interview meetings are hosted by them, not a shared account)
export const zoomApi = {
  init: () => api.get('/zoom/init'),
  status: () => api.get('/zoom/status'),
  disconnect: () => api.delete('/zoom/disconnect'),
};

// Extended Network
export const networkApi = {
  listAdvisors: (stage?: string) => api.get('/network/advisors', { params: stage ? { stage } : {} }),
  listContacts: () => api.get('/network/contacts'),
  addContact: (data: Record<string, unknown>) => api.post('/network/contacts', data),
  deleteContact: (id: string) => api.delete(`/network/contacts/${id}`),
  sendRequest: (data: Record<string, unknown>) => api.post('/network/requests', data),
  listRequests: () => api.get('/network/requests'),
};

// Admin
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  listIdeas: (status?: string) => api.get('/admin/ideas', { params: { status } }),
  moderateIdea: (id: string, moderation_status: string) => api.patch(`/admin/ideas/${id}`, { moderation_status }),
  deleteIdea: (id: string) => api.delete(`/admin/ideas/${id}`),
  getIdeaPosts: (id: string) => api.get(`/admin/ideas/${id}/posts`),
  listPosts: (status?: string) => api.get('/admin/posts', { params: { status } }),
  moderatePost: (id: string, moderation_status: string) => api.patch(`/admin/posts/${id}`, { moderation_status }),
  listUsers: () => api.get('/admin/users'),
  getProgress: () => api.get('/admin/progress'),
  impersonate: (id: string) => api.post(`/admin/users/${id}/impersonate`),
  resetPassword: (id: string, new_password: string) => api.post(`/admin/users/${id}/reset-password`, { new_password }),
  suspendUser: (id: string, suspended: boolean) => api.patch(`/admin/users/${id}/suspend`, { suspended }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  triggerWeeklyDigest: () => api.post('/admin/jobs/weekly-digest'),
  listFeedback: (status?: string) => api.get('/admin/feedback', { params: status ? { status } : {} }),
  updateFeedback: (id: string, data: { status?: string; admin_notes?: string }) => api.patch(`/admin/feedback/${id}`, data),
};

// Feedback (feature requests / bugs / improvements / general feedback) —
// noticeable everywhere via the FeedbackWidget (top-nav icon + floating tab
// in AppShell.tsx). Submissions go to a private admin-only inbox.
export const feedbackApi = {
  submit: (data: { category: 'feature' | 'bug' | 'improvement' | 'feedback'; message: string; page_context?: string }) =>
    api.post('/feedback', data),
};

// Donations
export const donationsApi = {
  createCheckout: (amount: number) => api.post('/donations/checkout', { amount }),
};

// Proof of Demand Challenges
export const challengesApi = {
  create:          (data: Record<string, unknown>) => api.post('/challenges', data),
  list:            ()                              => api.get('/challenges'),
  mine:            (ideaId?: string)               => api.get('/challenges/mine', { params: ideaId ? { idea_id: ideaId } : {} }),
  get:             (id: string)                    => api.get(`/challenges/${id}`),
  logConversation: (id: string, data: Record<string, unknown>) => api.post(`/challenges/${id}/conversations`, data),
  addOffer:        (id: string, offer_type: 'vouch' | 'fit', note?: string) => api.post(`/challenges/${id}/offers`, { offer_type, note }),
  removeOffer:     (id: string, offer_type: 'vouch' | 'fit') => api.delete(`/challenges/${id}/offers`, { params: { offer_type } }),
};

// Diagrams
export const diagramsApi = {
  getDiagram: (ideaId: string) => api.get(`/diagrams/${ideaId}`),
  saveDiagram: (ideaId: string, state: unknown) => api.put(`/diagrams/${ideaId}`, { state }),
};

// Interviews
export const interviewsApi = {
  list:            (ideaId: string) => api.get('/interviews', { params: { idea_id: ideaId } }),
  create:          (data: Record<string, unknown>) => api.post('/interviews', data),
  update:          (id: string, data: Record<string, unknown>) => api.patch(`/interviews/${id}`, data),
  remove:          (id: string) => api.delete(`/interviews/${id}`),
  getQuestions:    (id: string) => api.get(`/interviews/${id}/questions`),
  addQuestion:     (id: string, question: string) => api.post(`/interviews/${id}/questions`, { question }),
  updateQuestion:  (id: string, qid: string, data: Record<string, unknown>) => api.patch(`/interviews/${id}/questions/${qid}`, data),
  deleteQuestion:  (id: string, qid: string) => api.delete(`/interviews/${id}/questions/${qid}`),
  bookMeeting:     (id: string) => api.post(`/interviews/${id}/book-meeting`),
  getProviders:    () => api.get('/interviews/providers'),
  // AI alignment classification ("does this interview confirm the problem?")
  classify: (id: string, data: { problemSentence?: string; persona?: string; qa: { question: string; answer: string }[] }) =>
    api.post(`/interviews/${id}/ai-classify`, data),
  // "Reason with AI" — push back on / discuss the AI's classification
  reason: (id: string, data: { message: string; problemSentence?: string; persona?: string; qa: { question: string; answer: string }[] }) =>
    api.post(`/interviews/${id}/ai-reason`, data),
};

// Interview audio recordings
export const recordingsApi = {
  list: (interviewId: string) => api.get(`/interviews/${interviewId}/recordings`),
  upload: (interviewId: string, blob: Blob, opts: { questionN?: number | null; durationMs?: number } = {}) =>
    api.post(`/interviews/${interviewId}/recordings`, blob, {
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      params: {
        ...(opts.questionN != null ? { question_n: opts.questionN } : {}),
        ...(opts.durationMs != null ? { duration_ms: Math.round(opts.durationMs) } : {}),
      },
    }),
  audioBlob: (recordingId: string) => api.get(`/interviews/recordings/${recordingId}/audio`, { responseType: 'blob' }),
  remove: (recordingId: string) => api.delete(`/interviews/recordings/${recordingId}`),
};

// Pitch Deck
export const pitchDeckApi = {
  download: (ideaId: string) => api.get(`/pitch-deck/${ideaId}`, { responseType: 'blob' }),
};

// Notifications
export const notificationsApi = {
  list:        ()           => api.get('/notifications'),
  unreadCount: ()           => api.get('/notifications/unread-count'),
  markRead:    (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: ()           => api.patch('/notifications/read-all'),
};

// Messages
export const messagesApi = {
  listConversations: () => api.get('/community/messages'),
  getOrCreate: (userId: string, ideaId?: string) =>
    api.get(`/community/messages/with/${userId}`, { params: { idea_id: ideaId } }),
  send: (conversationId: string, content: string) =>
    api.post(`/community/messages/${conversationId}`, { content }),
  markRead: (conversationId: string) =>
    api.patch(`/community/messages/${conversationId}/read`),
  unreadCount: () => api.get('/community/messages/unread-count'),
  searchUsers: (q: string) => api.get('/community/users/search', { params: { q } }),
  editMessage: (conversationId: string, messageId: string, content: string) =>
    api.patch(`/community/messages/${conversationId}/edit/${messageId}`, { content }),
};
