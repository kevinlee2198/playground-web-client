"use client";

import { addMember, leaveChat, removeMember, updateMemberRole } from "@/app/[locale]/chat/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRouter } from "@/i18n/navigation";
import { ChatRoomRole, ChatRoomRoleBadgeVariant } from "@/lib/constants";
import type { Edge } from "@/lib/graphql-connection";
import type { ChatRoomMemberNode, ChatRoomRole as ChatRoomRoleType } from "@/lib/types/chat";
import { LogOut, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FriendSelector } from "./friend-selector";
import { RemoveMemberDialog } from "./remove-member-dialog";

function canRemoveMember(currentUserRole: ChatRoomRoleType | null, targetRole: ChatRoomRoleType): boolean {
  if (currentUserRole === ChatRoomRole.OWNER && targetRole !== ChatRoomRole.OWNER) return true;
  if (currentUserRole === ChatRoomRole.ADMIN && targetRole === ChatRoomRole.MEMBER) return true;
  return false;
}

interface MemberListPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  members: Edge<ChatRoomMemberNode>[];
  currentUserId: string;
  isDirectMessage: boolean;
  onMembersChange: (members: Edge<ChatRoomMemberNode>[]) => void;
  currentUserRole: ChatRoomRoleType | null;
}

export function MemberListPanel({
  open,
  onOpenChange,
  roomId,
  members,
  currentUserId,
  isDirectMessage,
  onMembersChange,
  currentUserRole,
}: MemberListPanelProps) {
  const router = useRouter();
  const t = useTranslations("chat.members");
  const tChat = useTranslations("chat");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [transferTarget, setTransferTarget] = useState<{ userId: string; name: string } | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const memberUserIds = members.map((edge) => edge.node.user.id);

  const handleAddMembers = () => {
    if (selectedFriendIds.length === 0) {
      return;
    }

    startTransition(async () => {
      try {
        // Add members one by one
        const results = await Promise.all(
          selectedFriendIds.map((userId) => addMember(roomId, userId)),
        );

        const failedAdds = results.filter((r) => !r.success);

        if (failedAdds.length > 0) {
          toast.error(tChat("errors.addMember"));
        } else {
          // Update members list with new members
          const newMembers = results
            .filter((r) => r.success && r.member)
            .map((r) => ({
              cursor: r.member!.id,
              node: r.member!,
            }));

          onMembersChange([...members, ...newMembers]);
          toast.success(t("add") + " successful");
          setAddDialogOpen(false);
          setSelectedFriendIds([]);
        }
      } catch (error) {
        console.error("Error adding members:", error);
        toast.error(tChat("errors.addMember"));
      }
    });
  };

  const handleRemoveClick = (userId: string, name: string) => {
    setMemberToRemove({ userId, name });
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const result = await removeMember(roomId, memberToRemove.userId);

      if (result.success) {
        // Update members list by removing the member
        onMembersChange(
          members.filter((edge) => edge.node.user.id !== memberToRemove.userId),
        );
        toast.success(t("remove") + " successful");
        setRemoveDialogOpen(false);
        setMemberToRemove(null);
      } else {
        toast.error(result.message || tChat("errors.removeMember"));
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(tChat("errors.removeMember"));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRoleChange = (userId: string, name: string, newRole: ChatRoomRole, successKey: "promoteSuccess" | "demoteSuccess") => {
    startTransition(async () => {
      const result = await updateMemberRole(roomId, userId, newRole);
      if (result.success) {
        onMembersChange(
          members.map((edge) =>
            edge.node.user.id === userId
              ? { ...edge, node: { ...edge.node, role: newRole } }
              : edge,
          ),
        );
        toast.success(t(successKey, { name }));
      } else {
        toast.error(result.message || tChat("errors.updateRole"));
      }
    });
  };

  const handleConfirmTransfer = () => {
    if (!transferTarget) return;
    startTransition(async () => {
      const result = await updateMemberRole(roomId, transferTarget.userId, ChatRoomRole.OWNER);
      if (result.success) {
        // Update both users' roles locally
        onMembersChange(
          members.map((edge) => {
            if (edge.node.user.id === transferTarget.userId) {
              return { ...edge, node: { ...edge.node, role: ChatRoomRole.OWNER } };
            }
            if (edge.node.user.id === currentUserId) {
              return { ...edge, node: { ...edge.node, role: ChatRoomRole.MEMBER } };
            }
            return edge;
          }),
        );
        toast.success(t("transferSuccess"));
        setTransferTarget(null);
      } else {
        toast.error(result.message || tChat("errors.updateRole"));
      }
    });
  };

  const handleLeaveChat = () => {
    startTransition(async () => {
      const result = await leaveChat(roomId);
      if (result.success) {
        toast.success(t("leaveSuccess"));
        setLeaveDialogOpen(false);
        onOpenChange(false);
        router.push("/chat");
        return;
      }

      const errorMessage = result.errorType === "OwnerCannotLeaveError"
        ? t("cannotLeaveAsOwner")
        : result.message || tChat("errors.leaveChat");
      toast.error(errorMessage);
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            {!isDirectMessage && currentUserRole !== ChatRoomRole.OWNER && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLeaveDialogOpen(true)}
                disabled={isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("leaveChat")}
              </Button>
            )}
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {!isDirectMessage && (
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="w-full"
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {t("add")}
              </Button>
            )}

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3">
                {members.map((edge) => {
                  const member = edge.node;
                  const isCurrentUser = member.user.id === currentUserId;
                  const memberName = `${member.user.firstName} ${member.user.lastName}`;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {memberName}
                            {isCurrentUser && " (You)"}
                          </span>
                          <Badge
                            variant={ChatRoomRoleBadgeVariant[member.role]}
                          >
                            {t(
                              member.role.toLowerCase() as
                                | "owner"
                                | "admin"
                                | "member",
                            )}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("joined", {
                            date: new Date(
                              member.joinedDate,
                            ).toLocaleDateString(),
                          })}
                        </div>
                      </div>

                      {!isDirectMessage && !isCurrentUser && (
                        <div className="flex gap-1">
                          {currentUserRole === ChatRoomRole.OWNER && member.role === ChatRoomRole.MEMBER && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRoleChange(member.user.id, memberName, ChatRoomRole.ADMIN, "promoteSuccess")}
                              disabled={isPending}
                            >
                              {t("promoteToAdmin")}
                            </Button>
                          )}
                          {currentUserRole === ChatRoomRole.OWNER && member.role === ChatRoomRole.ADMIN && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRoleChange(member.user.id, memberName, ChatRoomRole.MEMBER, "demoteSuccess")}
                                disabled={isPending}
                              >
                                {t("demoteToMember")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTransferTarget({ userId: member.user.id, name: memberName })}
                                disabled={isPending}
                              >
                                {t("transferOwnership")}
                              </Button>
                            </>
                          )}
                          {canRemoveMember(currentUserRole, member.role) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveClick(member.user.id, memberName)}
                              disabled={isPending}
                            >
                              {t("remove")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
          </DialogHeader>

          <FriendSelector
            selectedIds={selectedFriendIds}
            onSelectionChange={setSelectedFriendIds}
            excludeUserIds={memberUserIds}
            currentUserId={currentUserId}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedFriendIds([]);
              }}
              disabled={isPending}
            >
              {tChat("message.cancel")}
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedFriendIds.length === 0 || isPending}
            >
              {t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      {memberToRemove && (
        <RemoveMemberDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          memberName={memberToRemove.name}
          onConfirm={handleConfirmRemove}
          isRemoving={isRemoving}
        />
      )}

      {/* Transfer Ownership Confirmation */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transferConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("transferConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tChat("message.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer} disabled={isPending}>
              {t("transferOwnership")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Chat Confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaveConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tChat("message.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveChat} disabled={isPending}>
              {t("leaveChat")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
