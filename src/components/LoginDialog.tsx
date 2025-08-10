'use client';

import React, { useState } from 'react';
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader, // Import DialogHeader component
  DialogTitle,  // Import DialogTitle component
} from '@/components/ui/dialog';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * LoginDialog Component
 * Provides a modal login form with email/password and social login options
 */

export default function LoginDialog() {
  const [isOpen, setIsOpen] = useState(false); // Controls dialog open state / Controla o estado aberto do diálogo

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger button / Botão de acionamento */}
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>Login</Button>
      </DialogTrigger>
      
      {/* Dialog content / Conteúdo do diálogo */}
      <DialogContent>
        {/* Dialog header / Cabeçalho do diálogo */}
        <DialogHeader>
          <DialogTitle className="text-center">
            Login to your account
            {/* Login na sua conta */}
          </DialogTitle>
        </DialogHeader>

        {/* Form content / Conteúdo do formulário */}
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              {/* Email input / Campo de email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>

              {/* Password input / Campo de senha */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {/* Senha */}
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                    {/* Esqueceu sua senha? */}
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  // Digite sua senha
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>

        {/* Footer with actions / Rodapé com ações */}
        <CardFooter className="flex-col gap-2">
          {/* Login button / Botão de login */}
          <Button type="submit" className="w-full mt-3">
            Login
          </Button>

          {/* Social login buttons / Botões de login social */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 p-0">
              <FcGoogle className="w-6 h-6" />
            </Button>
            <Button variant="outline" className="flex-1 p-0">
              <FaGithub className="w-6 h-6" />
            </Button>
          </div>

          {/* Signup link / Link de cadastro */}
          <div className="text-center text-sm mt-2">
            Don't have an account?{' '}
            {/* Não tem uma conta? */}
            <a href="#" className="font-medium text-black hover:underline">
              Create your account
              {/* Crie sua conta */}
            </a>
          </div>
        </CardFooter>
      </DialogContent>
    </Dialog>
  );
}