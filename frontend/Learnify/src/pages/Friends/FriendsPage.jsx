import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    UserPlus,
    UserSearch,
    SearchX,
    Loader2,
    Users,
    MessageCircle,
    MoreVertical,
    Check,
    X,
    Clock,
    Inbox,
    UserMinus,
    BookOpen,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import BottomNav from "../../components/layout/BottomNav";
import { getSidebarUser } from "../../services/authApi";
import {
    getFriends,
    getIncomingRequests,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    unfriend,
} from "../../services/friendsApi";
import "./FriendsTheme.css";

const SEARCH_DEBOUNCE_MS = 350;

export default function FriendsPage() {
    const navigate = useNavigate();
    const user = getSidebarUser();

    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");

    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [friendsError, setFriendsError] = useState("");

    const [requests, setRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [requestsError, setRequestsError] = useState("");

    // Tracks which person IDs currently have a request send/accept/decline
    // in flight, so that specific row can show a spinner/disabled state
    // without affecting the rest of the list.
    const [pendingActionIds, setPendingActionIds] = useState(new Set());

    const loadFriends = useCallback(async () => {
        setLoadingFriends(true);
        setFriendsError("");
        try {
            const list = await getFriends();
            setFriends(list);
        } catch (err) {
            setFriendsError(err.message || "Couldn't load your friends.");
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    const loadRequests = useCallback(async () => {
        setLoadingRequests(true);
        setRequestsError("");
        try {
            const list = await getIncomingRequests();
            setRequests(list);
        } catch (err) {
            setRequestsError(err.message || "Couldn't load friend requests.");
        } finally {
            setLoadingRequests(false);
        }
    }, []);

    // Load friends and incoming requests once on mount.
    useEffect(() => {
        loadFriends();
        loadRequests();
    }, [loadFriends, loadRequests]);

    // Debounced search: waits until the person pauses typing before hitting
    // the backend, so every keystroke doesn't fire its own request.
    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setSearchResults([]);
            setIsSearching(false);
            setSearchError("");
            return;
        }

        setIsSearching(true);
        setSearchError("");

        const timer = setTimeout(async () => {
            try {
                const results = await searchUsers(trimmed);
                setSearchResults(results);
            } catch (err) {
                setSearchError(err.message || "Search failed.");
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query]);

    const withPendingAction = async (personId, action) => {
        setPendingActionIds((prev) => new Set(prev).add(personId));
        try {
            await action();
        } finally {
            setPendingActionIds((prev) => {
                const next = new Set(prev);
                next.delete(personId);
                return next;
            });
        }
    };

    const handleSendRequest = (personId) =>
        withPendingAction(personId, async () => {
            try {
                const result = await sendFriendRequest(personId);
                if (result?.status === "accepted") {
                    // The other person had already requested us, so the
                    // backend accepted theirs on the spot — they're a
                    // friend now, not just a pending request.
                    setSearchResults((prev) => prev.filter((p) => p.id !== personId));
                    await loadFriends();
                } else {
                    // Mark them as pending in place rather than removing
                    // them, so the person can still see who they've
                    // already reached out to.
                    setSearchResults((prev) =>
                        prev.map((p) =>
                            p.id === personId
                                ? { ...p, relationshipStatus: "pending_outgoing" }
                                : p,
                        ),
                    );
                }
            } catch (err) {
                setSearchError(err.message || "Couldn't send friend request.");
            }
        });

    const handleAcceptRequest = (personId) =>
        withPendingAction(personId, async () => {
            try {
                await acceptFriendRequest(personId);
                setRequests((prev) => prev.filter((p) => p.id !== personId));
                await loadFriends();
            } catch (err) {
                setRequestsError(err.message || "Couldn't accept friend request.");
            }
        });

    const handleDeclineRequest = (personId) =>
        withPendingAction(personId, async () => {
            try {
                await declineFriendRequest(personId);
                setRequests((prev) => prev.filter((p) => p.id !== personId));
            } catch (err) {
                setRequestsError(err.message || "Couldn't decline friend request.");
            }
        });

    // Removing a friend is destructive and can't be undone from the UI, so
    // confirm before actually calling the backend.
    const handleUnfriend = (person) => {
        const confirmed = window.confirm(
            `Remove ${person.name} from your friends?`,
        );
        if (!confirmed) return;

        withPendingAction(person.id, async () => {
            try {
                await unfriend(person.id);
                setFriends((prev) => prev.filter((p) => p.id !== person.id));
            } catch (err) {
                setFriendsError(err.message || "Couldn't remove friend.");
            }
        });
    };

    // Messaging/friend-options aren't built yet — route to the existing
    // (placeholder) Messages page rather than silently doing nothing, so
    // clicking the button doesn't feel broken.
    const handleMessageFriend = () => navigate("/messages");
    const handleOpenFriendMenu = () => { };

    const hasQuery = query.trim().length > 0;

    return (
        <div
            className="flex h-screen w-full bg-[#f9f9f6] overflow-hidden"
            style={{ fontFamily: "var(--font-body)" }}
        >
            <Sidebar user={user} />

            <main className="flex-1 h-screen overflow-y-auto">
                {/* Mobile top bar */}
                <header className="flex md:hidden justify-between items-center w-full px-4 py-3 bg-[#f9f9f6]/80 backdrop-blur-md sticky top-0 z-40">
                    <h1
                        className="text-[22px] font-extrabold"
                        style={{ color: "var(--color-forest)", fontFamily: "var(--font-display)" }}
                    >
                        Friends
                    </h1>
                </header>

                <div className="p-6 md:p-10 max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="mb-8 hidden md:block">
                        <h2 className="text-[28px] md:text-[32px] font-semibold text-on-surface mb-1">
                            Friends
                        </h2>
                        <p className="text-on-surface-variant">
                            Search for friends and see your friend list.
                        </p>
                    </header>

                    {/* Search bar */}
                    <div className="flex gap-3 mb-8">
                        <div className="relative flex-grow">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, university, or course..."
                                className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* Friend requests — only shown when there's something to act on */}
                    {(loadingRequests || requests.length > 0 || requestsError) && (
                        <section className="bg-white rounded-3xl p-4 md:p-5 border border-outline-variant/30 border-l-4 border-l-primary shadow-[0_4px_20px_rgba(0,0,0,0.04)] mb-6">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="text-xl font-semibold text-on-surface flex items-center gap-2">
                                    <Inbox size={20} className="text-primary" />
                                    Friend Requests {requests.length > 0 && `(${requests.length})`}
                                </h3>
                            </div>

                            {requestsError && (
                                <p className="text-sm text-error px-2 mb-2">{requestsError}</p>
                            )}

                            {loadingRequests ? (
                                <EmptyState icon={Loader2} iconClassName="animate-spin" title="Loading requests..." />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {requests.map((person) => (
                                        <PersonRow
                                            key={person.id}
                                            person={person}
                                            circularAvatar
                                            action={
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(person.id)}
                                                        disabled={pendingActionIds.has(person.id)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:opacity-90 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {pendingActionIds.has(person.id) ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <Check size={16} />
                                                        )}
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeclineRequest(person.id)}
                                                        disabled={pendingActionIds.has(person.id)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline-variant/30 text-on-surface-variant hover:text-error transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        aria-label={`Decline request from ${person.name}`}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Two column grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Search results */}
                        <section className="bg-white rounded-3xl p-4 md:p-5 border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="text-xl font-semibold text-on-surface">
                                    Search Results
                                </h3>
                                {hasQuery && !isSearching && (
                                    <span className="text-xs text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                                        {searchResults.length}{" "}
                                        {searchResults.length === 1 ? "result" : "results"} found
                                    </span>
                                )}
                            </div>

                            {searchError && (
                                <p className="text-sm text-error px-2 mb-2">{searchError}</p>
                            )}

                            {!hasQuery ? (
                                <EmptyState
                                    icon={UserSearch}
                                    title="Search for people"
                                    message="Start typing a name, university, or course to find fellow students."
                                />
                            ) : isSearching ? (
                                <EmptyState icon={Loader2} iconClassName="animate-spin" title="Searching..." />
                            ) : searchResults.length === 0 ? (
                                <EmptyState
                                    icon={SearchX}
                                    title="No results found"
                                    message="Try a different name, university, or course."
                                />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {searchResults.map((person) => {
                                        const isPending = person.relationshipStatus === "pending_outgoing";
                                        const isBusy = pendingActionIds.has(person.id);
                                        return (
                                            <PersonRow
                                                key={person.id}
                                                person={person}
                                                action={
                                                    <button
                                                        onClick={() => handleSendRequest(person.id)}
                                                        disabled={isBusy || isPending}
                                                        className={
                                                            isPending
                                                                ? "flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-xl text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed"
                                                                : "flex items-center gap-1.5 px-4 py-2 border border-primary text-primary rounded-xl text-sm font-medium hover:bg-primary hover:text-white transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                                        }
                                                    >
                                                        {isBusy ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : isPending ? (
                                                            <Clock size={16} />
                                                        ) : (
                                                            <UserPlus size={16} />
                                                        )}
                                                        {isPending ? "Request Sent" : "Add Friend"}
                                                    </button>
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Your friends */}
                        <section className="bg-white rounded-3xl p-4 md:p-5 border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="text-xl font-semibold text-on-surface">
                                    Your Friends {friends.length > 0 && `(${friends.length})`}
                                </h3>
                            </div>

                            {friendsError && (
                                <p className="text-sm text-error px-2 mb-2">{friendsError}</p>
                            )}

                            {loadingFriends ? (
                                <EmptyState icon={Loader2} iconClassName="animate-spin" title="Loading friends..." />
                            ) : friends.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="No friends yet"
                                    message="Friends you add will show up here."
                                />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {friends.map((person) => (
                                        <PersonRow
                                            key={person.id}
                                            person={person}
                                            circularAvatar
                                            action={
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleMessageFriend}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all"
                                                        aria-label={`Message ${person.name}`}
                                                    >
                                                        <MessageCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUnfriend(person)}
                                                        disabled={pendingActionIds.has(person.id)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline-variant/30 text-on-surface-variant hover:text-error transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        aria-label={`Unfriend ${person.name}`}
                                                        title="Unfriend"
                                                    >
                                                        {pendingActionIds.has(person.id) ? (
                                                            <Loader2 size={18} className="animate-spin" />
                                                        ) : (
                                                            <UserMinus size={18} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={handleOpenFriendMenu}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline-variant/30 text-on-surface-variant"
                                                        aria-label={`More options for ${person.name}`}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                {/* Mobile bottom spacing — keeps content clear of the fixed BottomNav below */}
                <div className="md:hidden h-24" />
            </main>

            {/* Mobile bottom nav */}
            <BottomNav />
        </div>
    );
}

/**
 * One row in either column. `person` shape (from friendsApi.js):
 *   { id, name, avatarUrl?, school?, course?, relationshipStatus? }
 */
// A few theme-defined container colors to cycle avatar fallbacks through,
// so a list of initials isn't a wall of identical gray circles. Picked
// deterministically from the name so the same person always gets the same
// color instead of it changing on every re-render.
const AVATAR_PALETTES = [
    { bg: "bg-primary-container", text: "text-on-primary-container" },
    { bg: "bg-secondary-container", text: "text-on-surface" },
    { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
];

function pickPalette(name) {
    const code = (name || "?").charCodeAt(0) || 0;
    return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

function PersonRow({ person, action, circularAvatar = false, showBadge = true }) {
    const palette = pickPalette(person.name);

    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-container-low transition-all border border-transparent hover:border-outline-variant/20">
            <div className="relative shrink-0">
                {person.avatarUrl ? (
                    <img
                        src={person.avatarUrl}
                        alt={person.name}
                        className={`w-14 h-14 object-cover ${circularAvatar ? "rounded-full" : "rounded-2xl"
                            }`}
                    />
                ) : (
                    <div
                        className={`w-14 h-14 flex items-center justify-center font-semibold text-lg ${palette.bg} ${palette.text} ${circularAvatar ? "rounded-full" : "rounded-2xl"
                            }`}
                    >
                        {person.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                )}

                {showBadge && (
                    <span
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white ring-1 ring-outline-variant shadow-sm flex items-center justify-center"
                        title="Learnify student"
                        aria-hidden="true"
                    >
                        <BookOpen size={12} className="text-primary" strokeWidth={2.5} />
                    </span>
                )}
            </div>

            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-on-surface truncate">{person.name}</h4>
                {(person.school || person.course) && (
                    <p className="text-xs text-on-surface-variant truncate">
                        {[person.school, person.course].filter(Boolean).join(" • ")}
                    </p>
                )}
            </div>

            {action}
        </div>
    );
}

function EmptyState({ icon: Icon, iconClassName = "", title, message }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <Icon size={36} className={`text-outline mb-3 ${iconClassName}`} />
            <p className="font-semibold text-on-surface mb-1">{title}</p>
            {message && (
                <p className="text-sm text-on-surface-variant max-w-xs">{message}</p>
            )}
        </div>
    );
}