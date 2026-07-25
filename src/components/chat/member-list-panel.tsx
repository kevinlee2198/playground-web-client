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
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { useRouter } from "@/i18n/navigation";
import { ChatRoomRole, ChatRoomRoleBadgeVariant } from "@/lib/constants";
import type { Edge } from "@/lib/graphql-connection";
import type { ChatRoomMemberNode, ChatRoomRole as ChatRoomRoleType } from "@/lib/types/chat";
import { LogOut, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { RemoveMemberDialog } from "./remove-member-dialog";

const MutualFollowSelector = dynamic(
  () =>
    import("./mutual-follow-selector").then((m) => m.MutualFollowSelector),
  { ssr: false },
);

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
  currentUserId: number;
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
  const format = useFormatter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: number;
    name: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [transferTarget, setTransferTarget] = useState<{ userId: number; name: string } | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const memberUserIds = members.map((edge) => edge.node.user.id);

  const handleAddMembers = () => {
    if (selectedMemberIds.length === 0) {
      return;
    }

    startTransition(async () => {
      try {
        // Add members one by one
        const results = await Promise.all(
          selectedMemberIds.map((userId) => addMember(roomId, userId)),
        );

        const failedAdds = results.filter((r) => !r.success);

        if (failedAdds.length > 0) {
          const hasMutualFollowError = failedAdds.some(
            (r) => r.errorType === "MutualFollowRequiredError",
          );
          toast.add({
            title: hasMutualFollowError
              ? tChat("mutualFollowRequired")
              : tChat("errors.addMember"),
            type: "error",
          });
        } else {
          // Update members list with new members
          const newMembers = results
            .filter((r) => r.success && r.member)
            .map((r) => ({
              cursor: r.member!.id,
              node: r.member!,
            }));

          onMembersChange([...members, ...newMembers]);
          toast.add({ title: t("add") + " successful", type: "success" });
          setAddDialogOpen(false);
          setSelectedMemberIds([]);
        }
      } catch (error) {
        console.error("Error adding members:", error);
        toast.add({ title: tChat("errors.addMember"), type: "error" });
      }
    });
  };

  const handleRemoveClick = (userId: number, name: string) => {
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
        toast.add({ title: t("remove") + " successful", type: "success" });
        setRemoveDialogOpen(false);
        setMemberToRemove(null);
      } else {
        toast.add({ title: result.message || tChat("errors.removeMember"), type: "error" });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.add({ title: tChat("errors.removeMember"), type: "error" });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRoleChange = (userId: number, name: string, newRole: ChatRoomRole, successKey: "promoteSuccess" | "demoteSuccess") => {
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
        toast.add({ title: t(successKey, { name }), type: "success" });
      } else {
        toast.add({ title: result.message || tChat("errors.updateRole"), type: "error" });
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
        toast.add({ title: t("transferSuccess"), type: "success" });
        setTransferTarget(null);
      } else {
        toast.add({ title: result.message || tChat("errors.updateRole"), type: "error" });
      }
    });
  };

  const handleLeaveChat = () => {
    startTransition(async () => {
      const result = await leaveChat(roomId);
      if (result.success) {
        toast.add({ title: t("leaveSuccess"), type: "success" });
        setLeaveDialogOpen(false);
        onOpenChange(false);
        router.push("/chat");
        return;
      }

      const errorMessage = result.errorType === "OwnerCannotLeaveError"
        ? t("cannotLeaveAsOwner")
        : result.message || tChat("errors.leaveChat");
      toast.add({ title: errorMessage, type: "error" });
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
                  const memberName = member.user.displayName;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <TypographySmall className="font-medium">
                            {memberName}
                            {isCurrentUser && ` (${t("you")})`}
                          </TypographySmall>
                          {!isDirectMessage && (
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
                          )}
                        </div>
                        <TypographyMuted className="text-xs">
                          {t("joined", {
                            date: format.dateTime(
                              new Date(member.joinedDate),
                              { dateStyle: "medium" },
                            ),
                          })}
                        </TypographyMuted>
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

          <MutualFollowSelector
            selectedIds={selectedMemberIds}
            onSelectionChange={setSelectedMemberIds}
            excludeUserIds={memberUserIds}
            currentUserId={currentUserId}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedMemberIds([]);
              }}
              disabled={isPending}
            >
              {tChat("message.cancel")}
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedMemberIds.length === 0 || isPending}
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
