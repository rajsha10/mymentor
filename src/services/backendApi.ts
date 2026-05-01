import { getIdToken } from 'firebase/auth';
import { auth } from '../config/firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await getIdToken(user);
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createAgent(name: string, description: string, classroomId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/create-agent`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, classroom_id: classroomId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listAgents(): Promise<{ id: string; name: string; description: string; bot_type?: string | null; is_public?: boolean }[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/list-agents`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.agents;
}

export async function listClassroomAgents(classroomId: string): Promise<{ id: string; name: string; description: string }[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ classroom_id: classroomId });
  const res = await fetch(`${BACKEND_URL}/list-classroom-agents?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.agents;
}

export async function listDocuments(agentId: string): Promise<{ doc_id: string; filename: string; chunks: number }[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ agent_id: agentId });
  const res = await fetch(`${BACKEND_URL}/list-documents?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.documents;
}

export async function addDocument(agentId: string, file: File) {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('agent_id', agentId);
  formData.append('file', file);
  const res = await fetch(`${BACKEND_URL}/add-document`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteDocument(agentId: string, filename: string) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ agent_id: agentId, filename });
  const res = await fetch(`${BACKEND_URL}/delete-document?${params}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getQueryHistory(agentId: string): Promise<{ id: string; question: string; answer: string; created_at: string }[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ agent_id: agentId });
  const res = await fetch(`${BACKEND_URL}/query-history?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.messages;
}

export async function queryAgent(question: string, agentId: string, file?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/query-agent`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, agent_id: agentId, file }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    answer: string;
    explanation?: string;
    sources: { file: string; page: number }[];
    confidence: string;
    out_of_scope?: boolean;
    actions?: string[];
  }>;
}

export async function getWeakAreas(agentId: string): Promise<{
  weak_areas: { topic: string; total_queries: number; low_confidence_count: number; weak_score: number }[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ agent_id: agentId });
  const res = await fetch(`${BACKEND_URL}/weak-areas?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLearningInsights(): Promise<{
  by_classroom: {
    classroom_id: string;
    weak_areas: { topic: string; total_queries: number; low_confidence_count: number; weak_score: number }[];
    query_count: number;
  }[];
  overall_confidence: 'High' | 'Medium' | 'Low';
  last_activity: string | null;
  total_queries: number;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/learning-insights`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return {
    ...data,
    by_classroom: Array.isArray(data.by_classroom)
      ? data.by_classroom.map((c: any) => ({
          ...c,
          weak_areas: Array.isArray(c.weak_areas) ? c.weak_areas : [],
        }))
      : [],
  };
}

export async function generateTest(agentId: string): Promise<{
  topic: string;
  weak_score: number;
  test: { question: string; options: string[]; answer: string }[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ agent_id: agentId });
  const res = await fetch(`${BACKEND_URL}/generate-test?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type QuestionType = 'mcq' | 'short_answer' | 'conceptual';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TestQuestion {
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
}

export interface TeacherTestResult {
  topic: string;
  difficulty: Difficulty;
  question_types: QuestionType[];
  questions: TestQuestion[];
}

export async function teacherGenerateTest(params: {
  agent_id: string;
  class_id: number;
  topic: string;
  difficulty: Difficulty;
  question_types: QuestionType[];
  count: number;
}): Promise<TeacherTestResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/teacher/generate-test`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Student-facing test types
export interface StudentTestSummary {
  id: number;
  topic: string;
  question_count: number;
  created_at: string;
  attempted: boolean;
  score: number | null;
  evaluated_at: string | null;
}

export interface StudentTestQuestion {
  type: QuestionType;
  question: string;
  options?: string[];
}

export interface StudentTestDetail {
  id: number;
  topic: string;
  agent_id: string;
  questions: StudentTestQuestion[];
}

export interface AnswerBreakdown {
  question_index: number;
  question: string;
  type: QuestionType;
  student_answer: string;
  correct_answer: string;
  correct: boolean;
  points: number;
}

export interface SubmitTestResult {
  score: number;
  max_score: number;
  score_pct: number;
  weak_areas: string[];
  breakdown: AnswerBreakdown[];
}

export async function listStudentTests(classId: number): Promise<StudentTestSummary[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ class_id: String(classId) });
  const res = await fetch(`${BACKEND_URL}/student/tests?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.tests;
}

export async function getStudentTest(testId: number): Promise<StudentTestDetail> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/student/tests/${testId}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitStudentTest(
  testId: number,
  answers: { question_index: number; answer: string }[]
): Promise<SubmitTestResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/student/submit-test`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_id: testId, answers }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function answerGeneral(question: string, agentId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/answer-general`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, agent_id: agentId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    answer: string;
    sources: { file: string; page: number }[];
    confidence: string;
    out_of_scope: boolean;
    general_knowledge: boolean;
  }>;
}

export async function deleteAgent(agentId: string) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ agent_id: agentId });
  const res = await fetch(`${BACKEND_URL}/delete-agent?${params}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createClassroomBots(classroomId: string, classroomName: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/create-classroom-bots`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ classroom_id: classroomId, classroom_name: classroomName }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string; bots: { bot_type: string; agent_id: string }[] }>;
}

export async function getClassroomBot(classroomId: string, botType: 'homework' | 'assignments' | 'tests') {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ classroom_id: classroomId, bot_type: botType });
  const res = await fetch(`${BACKEND_URL}/get-classroom-bot?${params}`, { headers });
  if (!res.ok) return null;
  return res.json() as Promise<{ agent_id: string; name: string }>;
}

export async function toggleAgentPublic(agentId: string, isPublic: boolean) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/toggle-agent-public`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, is_public: isPublic }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string; is_public: boolean }>;
}

export async function listPublicAgents(): Promise<{ id: string; name: string; description: string; user_id: string }[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/list-public-agents`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.agents;
}

export async function searchAndAdd(agentId: string, topic: string): Promise<{ status: string; topic: string; chunks_added: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/search-and-add`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, topic }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getClassroomAgentUsage(
  classroomId: string
): Promise<{
  agents: {
    agent_id: string;
    name: string;
    bot_type: 'homework' | 'assignments' | 'tests' | null;
    query_count: number;
  }[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ classroom_id: classroomId });
  const res = await fetch(`${BACKEND_URL}/classroom-agent-usage?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getClassroomWeakTopics(
  classroomId: string,
  userIds: string[]
): Promise<{
  topics: {
    topic: string;
    struggling_count: number;
    total_with_topic: number;
    struggling_pct: number;
    struggling_user_ids: string[];
  }[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    classroom_id: classroomId,
    user_ids: userIds.join(','),
  });
  const res = await fetch(`${BACKEND_URL}/classroom-weak-topics?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getClassroomLeaderboard(
  classroomId: string,
  userIds: string[]
): Promise<{
  entries: {
    user_id: string;
    engagement: number;
    understanding: number;
    consistency: number;
    final: number;
  }[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    classroom_id: classroomId,
    user_ids: userIds.join(','),
  });
  const res = await fetch(`${BACKEND_URL}/classroom-leaderboard?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getScoreHistory(): Promise<{
  points: { date: string; score: number }[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/score-history`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getActivityTimeline(): Promise<{
  events: {
    date: string;
    topic: string;
    question_count: number;
    confidence: 'High' | 'Medium' | 'Low';
    improved: boolean;
  }[];
  active_days_this_week: number;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/activity-timeline`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveToContext(agentId: string, question: string, answer: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/save-to-context`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, question, answer }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string }>;
}

// ── Assignment types ──────────────────────────────────────────────────────────

export type AssignmentType = 'descriptive' | 'long_form' | 'project';

export interface AssignmentQuestion {
  type: AssignmentType;
  question: string;
  guidance: string;
  marks: number;
}

export interface TeacherAssignmentResult {
  id: number | null;
  topic: string;
  assignment_types: AssignmentType[];
  deadline: string;
  questions: AssignmentQuestion[];
}

export interface AssignmentSummary {
  id: number;
  topic: string;
  question_count: number;
  deadline: string;
  submitted: boolean;
  marks: number | null;
  submitted_at: string | null;
  // teacher-only
  submission_count?: number;
  created_at?: string;
}

export interface AssignmentDetail {
  id: number;
  topic: string;
  deadline: string;
  questions: AssignmentQuestion[];
}

export interface AssignmentBreakdown {
  question_index: number;
  question: string;
  type: AssignmentType;
  marks_earned: number;
  marks_total: number;
  word_count: number;
  student_answer: string;
}

export interface SubmitAssignmentResult {
  marks: number;
  max_marks: number;
  score_pct: number;
  breakdown: AssignmentBreakdown[];
  note: string;
}

export async function teacherGenerateAssignment(params: {
  agent_id: string;
  class_id: number;
  topic: string;
  assignment_types: AssignmentType[];
  count: number;
  deadline: string;
}): Promise<TeacherAssignmentResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/teacher/generate-assignment`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listStudentAssignments(classId: number): Promise<AssignmentSummary[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ class_id: String(classId) });
  const res = await fetch(`${BACKEND_URL}/student/assignments?${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.assignments;
}

export async function getStudentAssignment(assignmentId: number): Promise<AssignmentDetail> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/student/assignments/${assignmentId}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitStudentAssignment(
  assignmentId: number,
  answers: { question_index: number; answer: string }[]
): Promise<SubmitAssignmentResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/student/submit-assignment`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment_id: assignmentId, answers }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
