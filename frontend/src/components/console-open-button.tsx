"use client";

import { Monitor, ExternalLink, AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface ConsoleOpenButtonProps {
  workspaceId: string;
  vm?: string;
  variant: "button" | "dropdown-item";
  size?: "sm" | "default" | "lg" | "icon";
}

function getConsoleUrl(workspaceId: string, vm?: string): string {
  const base = `/console/${workspaceId}`;
  return vm !== undefined ? `${base}?vm=${vm}` : base;
}

function openNewTab(url: string) {
  window.open(url, "_blank");
}

function openPopup(url: string, workspaceId: string) {
  window.open(
    url,
    `vm-console-${workspaceId}`,
    "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no"
  );
}

export function ConsoleOpenButton({
  workspaceId,
  vm,
  variant,
  size = "sm",
}: ConsoleOpenButtonProps) {
  const url = getConsoleUrl(workspaceId, vm);

  if (variant === "dropdown-item") {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Monitor className="mr-2 h-4 w-4" />
          Console
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onSelect={() => openNewTab(url)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            New Tab
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openPopup(url, workspaceId)}>
            <AppWindow className="mr-2 h-4 w-4" />
            Popup Window
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size}>
          <Monitor className="mr-2 h-3 w-3" />
          Console
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => openNewTab(url)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          New Tab
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openPopup(url, workspaceId)}>
          <AppWindow className="mr-2 h-4 w-4" />
          Popup Window
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
