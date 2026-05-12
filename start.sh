#!/bin/bash

echo "Starting Playit tunnel..."
./playit &   # assumes playit binary is in same folder

sleep 5

while true
do
  echo "Starting Minecraft server..."
  java -Xms8G -Xmx16G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -jar paper.jar nogui

  EXIT_CODE=$?
  echo "Server stopped (code $EXIT_CODE). Restarting in 5 seconds..."
  sleep 5
done