"use client";

import { useUser } from '@clerk/nextjs';
import { Todo } from '@prisma/client';
import React, {  useCallback, useEffect, useState } from 'react'
import { useDebounceValue } from 'usehooks-ts';
function Dashboard() {

    const {user} = useUser();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [debouncedSearchTerm] = useDebounceValue(searchTerm, 500);
    
    const fetchTodos = useCallback(async (page:number) => {
            try {
              const response = await fetch(`/api/todos?page=${page}&search=
                ${debouncedSearchTerm}`)

                if(!response.ok){
                  throw new Error("failed to fetch todos");
                }
                const data = await response.json()
                setTodos(data.todos)
                setTotalPages(data.totalPages)
                setCurrentPage(data.currentPage)
            } catch (error) {
               
            }
    }, [debouncedSearchTerm]); 

    useEffect(() => {
        fetchTodos(1);
        fetchSubscriptionStatus();
    }, []);

    const fetchSubscriptionStatus = async () =>{
      const response = await fetch("api/subscription")

      if(response.ok){
        const data = await response.json()
        setIsSubscribed(data.isSubscribed)
    }
  }
    const handleAddTodo = async (title: string)=>{
      try {
        const response = await fetch("/api/todos", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({title})
        })
        if(!response.ok){
          throw new Error("failed to add todo");
        }

        await fetchTodos(currentPage)
      } catch (error) {
        console.log(error)
      }
    }

    const handleUpdateTodo = async (id: string, completed: boolean) => {
      try {
          const response = await fetch(`/api/todos/${id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({completed})
          })
          if(!response.ok){
            throw new Error("failed to update todo");
          }
          await fetchTodos(currentPage)
      } catch (error) {
        console.log(error)
      }
    }

    const handleDeleteTodo = async (id: string) => {
        const response = await fetch(`/api/todos/${id}`, {
          method: "DELETE",
         });
         if(!response.ok){
          throw new Error("failed to delete todo");
        }

        await fetchTodos(currentPage)



    }

  return (
    <div> Dashboard</div>
  )
}

export default Dashboard