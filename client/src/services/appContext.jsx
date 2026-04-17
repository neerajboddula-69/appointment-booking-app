import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AppContext = createContext(null);

const initialForm = {
  name: "",
  phone: "",
  role: "customer",
  email: "",
  password: ""
};

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = window.localStorage.getItem("appointment-session");
    return raw ? JSON.parse(raw) : null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [dashboard, setDashboard] = useState({ appointments: [], waitlist: [], insights: [], notifications: [] });
  const [selectedService, setSelectedService] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState("2026-04-15");
  const [schedule, setSchedule] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [bookingPriority, setBookingPriority] = useState("normal");
  const [bookingNote, setBookingNote] = useState("");
  const [activeSlot, setActiveSlot] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("appointment-session", JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      loadDashboard(session.user);
      loadConversations(session.user);
      const intervalId = window.setInterval(() => loadConversations(session.user), 12000);
      return () => window.clearInterval(intervalId);
    }
    setConversations([]);
    return undefined;
  }, [session]);

  useEffect(() => {
    api("/services").then((items) => {
      setServices(items);
      setSelectedService((current) => current || items[0]?.id || "");
    });

    api("/providers").then((items) => {
      setProviders(items);
      setSelectedProvider((current) => current || items[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!selectedService || providers.length === 0) return;

    const matchingProviders = providers.filter((provider) => provider.serviceIds.includes(selectedService));
    if (matchingProviders.length > 0 && !matchingProviders.some((p) => p.id === selectedProvider)) {
      setSelectedProvider(matchingProviders[0].id);
    }
  }, [selectedService, providers, selectedProvider]);

  useEffect(() => {
    if (!selectedDate) return;

    const params = new URLSearchParams({
      date: selectedDate,
      ...(selectedService ? { serviceId: selectedService } : {}),
      ...(selectedProvider ? { providerId: selectedProvider } : {})
    });

    api(`/appointments/schedule?${params.toString()}`).then((data) => setSchedule(data.slots));
  }, [selectedDate, selectedService, selectedProvider]);

  useEffect(() => {
    if (!session || session.user.role !== "customer" || !selectedService) {
      setRecommendations([]);
      return;
    }

    api(`/appointments/recommendations?customerId=${session.user.id}&date=${selectedDate}&serviceId=${selectedService}`)
      .then(setRecommendations);
  }, [session, selectedDate, selectedService]);

  async function loadDashboard(user = session?.user) {
    if (!user) return;
    const data = await api(`/appointments/dashboard?role=${user.role}&userId=${user.id}`);
    setDashboard(data);
  }

  async function loadConversations(user = session?.user) {
    if (!user) {
      setConversations([]);
      return [];
    }
    const data = await api(`/chat?role=${user.role}&userId=${user.id}`);
    setConversations(data);
    return data;
  }

  async function login() {
    setLoading(true);
    setMessage("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm)
      });
      setSession(data);
      await loadDashboard(data.user);
      setMessage(`Logged in as ${data.user.name}.`);
      return data;
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  // ✅ FIXED REGISTER FUNCTION
  async function register() {
    setLoading(true);
    setMessage("");

    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: loginForm.name,
          phone: loginForm.phone,
          email: loginForm.email,
          password: loginForm.password,
          role: loginForm.role
        })
      });

      setSession(data);
      setAuthMode("login");
      await loadDashboard(data.user);
      setMessage(data.message || "Account created successfully!");
      return data;

    } catch (error) {
      setMessage(error.message || "Unable to create customer account.");
      throw error;

    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setSession(null);
    setDashboard({ appointments: [], waitlist: [], insights: [], notifications: [] });
    setMessage("Signed out successfully.");
  }

  async function refreshSchedule(providerId = selectedProvider) {
    const params = new URLSearchParams({
      date: selectedDate,
      ...(selectedService ? { serviceId: selectedService } : {}),
      ...(providerId ? { providerId } : {})
    });

    const data = await api(`/appointments/schedule?${params.toString()}`);
    setSchedule(data.slots);
  }

  async function createBooking(slot = activeSlot) {
    if (!session || session.user.role !== "customer") {
      throw new Error("Customer login is required.");
    }

    setLoading(true);
    try {
      const data = await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          customerId: session.user.id,
          providerId: slot.providerId,
          serviceId: selectedService,
          date: slot.date,
          startTime: slot.startTime,
          priority: bookingPriority,
          note: bookingNote
        })
      });

      setMessage(data.message);
      await loadDashboard();
      await refreshSchedule(slot.providerId);
      return data;
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(() => ({
    session,
    authMode,
    setAuthMode,
    loginForm,
    setLoginForm,
    services,
    providers,
    dashboard,
    selectedService,
    setSelectedService,
    selectedProvider,
    setSelectedProvider,
    selectedDate,
    setSelectedDate,
    schedule,
    recommendations,
    conversations,
    bookingPriority,
    setBookingPriority,
    bookingNote,
    setBookingNote,
    activeSlot,
    setActiveSlot,
    message,
    setMessage,
    loading,
    login,
    register,
    logout,
    createBooking
  }), [session, authMode, loginForm, services, providers, dashboard, selectedService, selectedProvider, selectedDate, schedule, recommendations, conversations, bookingPriority, bookingNote, activeSlot, message, loading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}