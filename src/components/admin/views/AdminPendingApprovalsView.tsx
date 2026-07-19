import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Search, Bell, Building2, Tag, ChevronDown, Clock, MapPin, Users, Check, X, Eye, ArrowDownUp, Calendar, ChevronRight, Inbox } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const getCategoryColor = (category: string) => {
  switch(category?.toLowerCase()) {
    case 'technical': return "bg-[#5B21B6]/20 text-[#A78BFA] border-[#A78BFA]/20";
    case 'cultural': return "bg-[#9D174D]/20 text-[#F472B6] border-[#F472B6]/20";
    case 'sports': return "bg-orange-500/20 text-orange-400 border-orange-500/20";
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/20";
  }
};

const FilterDropdown = ({ 
  id, 
  icon: Icon, 
  value, 
  options, 
  onChange, 
  activeDropdown, 
  setActiveDropdown 
}: any) => {
  const isOpen = activeDropdown === id;
  const isStatus = id === 'status';
  const isSort = id === 'sort';

  const getStatusColor = (val: string) => {
    if (val === 'pending') return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
    if (val === 'approved') return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
    if (val === 'rejected') return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
    return "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
  };

  const displayValue = isStatus ? `Status: ${value.charAt(0).toUpperCase() + value.slice(1)}` : 
                       isSort ? `Sort by: ${value}` : value;
  
  const isActive = value !== options[0] || isStatus || isSort;

  return (
    <div className="relative">
      <button 
        onClick={() => setActiveDropdown(isOpen ? null : id)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap",
          isActive
            ? "bg-[#151820] border border-border/30 text-white" 
            : "bg-transparent border border-transparent text-muted-foreground hover:bg-[#151820] hover:text-white"
        )}
      >
        {isStatus && <span className={cn("w-2 h-2 rounded-full", getStatusColor(value))}></span>}
        {!isStatus && Icon && <Icon className="w-4 h-4" />}
        {displayValue}
        <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
          <div className="absolute top-full left-0 mt-2 min-w-[200px] max-h-[300px] overflow-y-auto bg-[#0F111A] border border-border/20 rounded-xl shadow-xl z-50 custom-scrollbar py-1">
            {options.map((opt: string) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setActiveDropdown(null); }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2",
                  value === opt ? "bg-[#1A1D24] text-white font-medium" : "text-white/70 hover:bg-[#1A1D24] hover:text-white"
                )}
              >
                {isStatus && <span className={cn("w-2 h-2 rounded-full", getStatusColor(opt))}></span>}
                {isStatus ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const AdminPendingApprovalsView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [clubFilter, setClubFilter] = useState("All Clubs");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Actions State
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [viewDetailsTarget, setViewDetailsTarget] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ["admin-pending-events", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          poster_url,
          category,
          starts_at,
          ends_at,
          venue,
          registration_closes_at,
          max_registrations,
          created_at,
          status,
          clubs ( name ),
          profiles!events_created_by_fkey ( full_name )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allClubs = [], isLoading: isLoadingClubs } = useQuery({
    queryKey: ["all-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("name").order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const uniqueCategories = [
    "All Categories",
    "Technical",
    "Workshop",
    "Hackathon",
    "Cultural",
    "Sports",
    "Seminar",
    "Placement",
    "Competition",
    "Other"
  ];
  
  const uniqueClubs = ["All Clubs", ...allClubs.map(c => c.name)];
  
  const isPageLoading = isLoading || isLoadingClubs;

  const filteredEvents = rawEvents.filter((event: any) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (event.clubs?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || event.category === categoryFilter;
    const matchesClub = clubFilter === "All Clubs" || event.clubs?.name === clubFilter;
    return matchesSearch && matchesCategory && matchesClub;
  }).sort((a: any, b: any) => {
    if (sortOrder === "Newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOrder === "Oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return 0;
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string, status: "approved" | "rejected", reason?: string }) => {
      const { error } = await supabase
        .from("events")
        .update({
          status,
          rejection_reason: reason || null,
          approved_by: user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      if (variables.status === "approved") {
        toast.success("Event approved successfully.");
        setApproveTarget(null);
      } else {
        toast.success("Event rejected successfully.");
        setRejectTarget(null);
        setRejectionReason("");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update event status.");
    }
  });

  const isEmpty = !isPageLoading && filteredEvents.length === 0;

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1E1B4B] text-[#818CF8] rounded-xl border border-[#312E81] shadow-inner">
            <CalendarClock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Pending Approvals</h1>
            <p className="text-muted-foreground text-sm mt-1">Review and manage events submitted by club managers</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event or club..." 
              className="pl-10 pr-4 py-2.5 bg-[#0F111A] border border-border/40 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 w-full md:w-64 text-white placeholder:text-muted-foreground/70 transition-all shadow-sm" 
            />
          </div>
          <button className="relative p-2.5 bg-[#0F111A] border border-border/40 rounded-xl hover:bg-[#1A1D24] transition-colors shadow-sm">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#818CF8] rounded-full text-[11px] flex items-center justify-center text-white font-bold border-2 border-[#050505]">6</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-2 mb-6 bg-[#0A0C10] border border-border/10 rounded-xl gap-4 xl:gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown 
            id="status"
            value={statusFilter}
            options={["pending", "approved", "rejected", "all"]}
            onChange={setStatusFilter}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
          />
          
          <FilterDropdown 
            id="category"
            icon={Tag}
            value={categoryFilter}
            options={uniqueCategories}
            onChange={setCategoryFilter}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
          />
          
          <FilterDropdown 
            id="club"
            icon={Building2}
            value={clubFilter}
            options={uniqueClubs}
            onChange={setClubFilter}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
          />
        </div>
        
        <FilterDropdown 
          id="sort"
          icon={ArrowDownUp}
          value={sortOrder}
          options={["Newest", "Oldest"]}
          onChange={setSortOrder}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
        />
      </div>

      <p className="text-sm text-muted-foreground mb-4 font-medium">
        {isPageLoading ? "Loading events..." : isEmpty ? "Total 0 events found" : `Total ${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'} found`}
      </p>

      {/* Loading Skeletons */}
      {isPageLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="flex flex-col xl:flex-row gap-6 p-4 rounded-2xl bg-[#0F111A] border border-border/20 animate-pulse">
              <div className="w-full xl:w-48 h-48 rounded-xl bg-border/20 shrink-0"></div>
              <div className="flex-1 py-2">
                <div className="h-6 bg-border/20 rounded w-24 mb-4"></div>
                <div className="h-8 bg-border/20 rounded w-3/4 mb-3"></div>
                <div className="h-5 bg-border/20 rounded w-1/3 mb-8"></div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-border/20"></div>
                  <div className="h-4 bg-border/20 rounded w-32"></div>
                </div>
              </div>
              <div className="w-full xl:w-[450px] flex gap-6 pt-4 xl:pt-2 border-t xl:border-t-0 xl:border-l border-border/10 xl:pl-6">
                <div className="flex-1 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-border/20 rounded w-full"></div>
                  ))}
                </div>
                <div className="w-[150px] space-y-3 shrink-0">
                  <div className="h-8 bg-border/20 rounded w-full mb-4"></div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-border/20 rounded w-full"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isPageLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl bg-[#0F111A] border border-border/20 text-center">
          <div className="p-5 rounded-full bg-[#151820] border border-border/30 mb-6">
            <Inbox className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No events found</h2>
          <p className="text-muted-foreground max-w-sm">
            We couldn't find any events matching your current filters. Try adjusting your search criteria or clearing filters.
          </p>
          {(searchQuery || statusFilter !== 'pending' || categoryFilter !== 'All Categories' || clubFilter !== 'All Clubs') && (
            <button 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("pending");
                setCategoryFilter("All Categories");
                setClubFilter("All Clubs");
                setSortOrder("Newest");
              }}
              className="mt-6 px-4 py-2 bg-[#1E1B4B] text-[#818CF8] hover:bg-[#312E81] border border-[#312E81] rounded-lg text-sm font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Event Cards */}
      {!isPageLoading && !isEmpty && (
        <>
          <div className="space-y-4">
            {filteredEvents.map((event: any) => {
              const eventDate = new Date(event.starts_at);
              const dateStr = format(eventDate, "dd MMMM yyyy");
              const timeStr = `${format(eventDate, "h:mm a")} ${event.ends_at ? `- ${format(new Date(event.ends_at), "h:mm a")}` : 'Onwards'}`;
              const regDeadlineStr = event.registration_closes_at ? format(new Date(event.registration_closes_at), "dd MMMM yyyy") : "Not specified";
              
              const clubName = event.clubs?.name || "Unknown Club";
              const managerName = event.profiles?.full_name || "Unknown Manager";
              const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true });

              return (
                <div key={event.id} className="flex flex-col xl:flex-row gap-6 p-4 rounded-2xl bg-[#0F111A] border border-border/20 hover:border-border/40 transition-all hover:shadow-lg">
                  
                  {/* Left: Poster */}
                  <div className="w-full xl:w-48 h-48 rounded-xl overflow-hidden shrink-0 relative border border-border/10 shadow-inner group bg-[#151820] flex items-center justify-center">
                    {event.poster_url ? (
                      <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <CalendarClock className="w-10 h-10 text-muted-foreground/30" />
                    )}
                  </div>
                  
                  {/* Middle: Details */}
                  <div className="flex-1 flex flex-col py-2 min-w-[250px]">
                    <div className="flex items-start">
                      <div>
                        <span className={cn("px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase border", getCategoryColor(event.category))}>
                          {event.category}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-3 tracking-tight line-clamp-2">{event.title}</h3>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Building2 className="w-4 h-4" /> {clubName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-6 flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span>Submitted by</span>
                      <div className="w-6 h-6 rounded-full bg-[#1E1B4B] border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                        {managerName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white/90 font-medium">{managerName}</span>
                      <span className="text-white/30">•</span>
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  {/* Right: Info Grid and Actions */}
                  <div className="w-full xl:w-auto flex-1 flex flex-col xl:flex-row gap-6 items-start justify-between py-2 border-t xl:border-t-0 xl:border-l border-border/10 pt-4 xl:pt-2 xl:pl-6">
                    
                    {/* Info Grid */}
                    <div className="space-y-3.5 flex-1 w-full xl:min-w-[280px]">
                      <div className="grid grid-cols-[160px_1fr] items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</span>
                        <span className="text-white/90 font-medium">{dateStr}</span>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Time</span>
                        <span className="text-white/90 font-medium">{timeStr}</span>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Venue</span>
                        <span className="text-white/90 font-medium truncate" title={event.venue}>{event.venue}</span>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Registration Deadline</span>
                        <span className="text-white/90 font-medium">{regDeadlineStr}</span>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Maximum Participants</span>
                        <span className="text-white/90 font-medium">{event.max_registrations}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 w-full xl:w-[150px] shrink-0">
                      {event.status === 'pending' && (
                        <span className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-xs font-semibold mb-2 shadow-sm">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                      {event.status === 'approved' && (
                        <span className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-xs font-semibold mb-2 shadow-sm">
                          <Check className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {event.status === 'rejected' && (
                        <span className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-md text-xs font-semibold mb-2 shadow-sm">
                          <X className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                      
                      <button 
                        onClick={() => setViewDetailsTarget(event)}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-transparent text-[#9F7AEA] border border-[#9F7AEA]/40 hover:bg-[#9F7AEA]/10 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" /> View Details
                      </button>
                      {event.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => setApproveTarget(event)}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-transparent text-[#10B981] border border-[#10B981]/40 hover:bg-[#10B981]/10 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button 
                            onClick={() => setRejectTarget(event)}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-transparent text-[#EF4444] border border-[#EF4444]/40 hover:bg-[#EF4444]/10 rounded-lg text-sm font-medium transition-colors"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {filteredEvents.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#818CF8] text-white font-medium shadow-lg shadow-indigo-500/20">1</button>
              {filteredEvents.length > 10 && (
                <>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent border border-border/20 text-muted-foreground hover:bg-[#1A1D24] hover:text-white font-medium transition-colors">2</button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent border border-border/20 text-muted-foreground hover:bg-[#1A1D24] hover:text-white font-medium transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="bg-[#0F111A] border border-border/20 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Event</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Are you sure you want to approve <span className="text-white font-medium">"{approveTarget?.title}"</span>? This event will become visible to all students on the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setApproveTarget(null)} className="hover:bg-[#1A1D24] text-white" disabled={updateStatusMutation.isPending}>Cancel</Button>
            <Button 
              onClick={() => updateStatusMutation.mutate({ id: approveTarget.id, status: 'approved' })} 
              className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Approving..." : "Approve Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if(!o) { setRejectTarget(null); setRejectionReason(""); } }}>
        <DialogContent className="bg-[#0F111A] border border-border/20 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Provide an optional reason for rejecting <span className="text-white font-medium">"{rejectTarget?.title}"</span>. The club manager will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-white/80">Rejection Reason</Label>
              <Textarea 
                id="reason" 
                value={rejectionReason} 
                onChange={e => setRejectionReason(e.target.value)} 
                placeholder="e.g. Venue is already booked for this date."
                className="bg-[#151820] border-border/30 text-white resize-none"
                rows={4}
                disabled={updateStatusMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setRejectionReason(""); }} className="hover:bg-[#1A1D24] text-white" disabled={updateStatusMutation.isPending}>Cancel</Button>
            <Button 
              onClick={() => updateStatusMutation.mutate({ id: rejectTarget.id, status: 'rejected', reason: rejectionReason })} 
              className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Rejecting..." : "Reject Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewDetailsTarget} onOpenChange={(o) => !o && setViewDetailsTarget(null)}>
        <DialogContent className="sm:max-w-[700px] bg-[#0F111A] border border-border/20 p-0 overflow-hidden text-white gap-0">
          {viewDetailsTarget && (
            <>
              <div className="relative h-48 sm:h-64 w-full bg-[#151820] flex items-center justify-center shrink-0 border-b border-border/10">
                {viewDetailsTarget.poster_url ? (
                  <img src={viewDetailsTarget.poster_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <CalendarClock className="w-12 h-12 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F111A] via-[#0F111A]/40 to-transparent" />
                <div className="absolute bottom-4 left-6 pr-6">
                   <span className={cn("px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase border mb-3 inline-block", getCategoryColor(viewDetailsTarget.category))}>
                    {viewDetailsTarget.category}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{viewDetailsTarget.title}</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white/80">Description & Rules</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {viewDetailsTarget.description || "No description or rules provided."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#151820] p-5 rounded-2xl border border-border/10 shadow-inner">
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-[#818CF8]" /> Date & Time</p>
                    <p className="font-medium text-white/90">
                      {format(new Date(viewDetailsTarget.starts_at), "dd MMMM yyyy")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(viewDetailsTarget.starts_at), "h:mm a")} {viewDetailsTarget.ends_at ? `- ${format(new Date(viewDetailsTarget.ends_at), "h:mm a")}` : 'Onwards'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-[#818CF8]" /> Venue</p>
                    <p className="font-medium text-white/90">{viewDetailsTarget.venue}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-[#818CF8]" /> Club & Manager</p>
                    <p className="font-medium text-white/90">{viewDetailsTarget.clubs?.name || "Unknown Club"}</p>
                    <p className="text-muted-foreground text-xs">Manager: {viewDetailsTarget.profiles?.full_name || "Unknown"}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-[#818CF8]" /> Participants</p>
                    <p className="font-medium text-white/90">Max {viewDetailsTarget.max_registrations}</p>
                  </div>
                  <div className="space-y-2 col-span-1 sm:col-span-2 pt-2 border-t border-border/10 mt-1">
                    <p className="text-muted-foreground flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-[#818CF8]" /> Timelines</p>
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Registration Closes</p>
                        <p className="font-medium text-sm text-white/90">{viewDetailsTarget.registration_closes_at ? format(new Date(viewDetailsTarget.registration_closes_at), "dd MMMM yyyy") : "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Submitted On</p>
                        <p className="font-medium text-sm text-white/90">{format(new Date(viewDetailsTarget.created_at), "dd MMMM yyyy")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};
