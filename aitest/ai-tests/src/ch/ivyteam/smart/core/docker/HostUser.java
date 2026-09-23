package ch.ivyteam.smart.core.docker;

import org.testcontainers.containers.GenericContainer;

public final class HostUser {

  public static void configure(GenericContainer<?> container, String containerName) {
    String uid = System.getenv().getOrDefault("HOST_UID", "1000");
    String gid = System.getenv().getOrDefault("HOST_GID", "1000");
    String user = uid + ":" + gid;
    System.out.println("Configuring " + containerName + " container to run as user: " + user);
    if (uid != null && !uid.isBlank() && gid != null && !gid.isBlank()) {
      container.withCreateContainerCmdModifier(cmd -> cmd.withUser(user));
    }
  }
}
