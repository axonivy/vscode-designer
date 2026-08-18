package ch.ivyteam.smart.core;

import java.util.function.Consumer;

import org.testcontainers.containers.output.OutputFrame;

public class SysoutLogger implements Consumer<OutputFrame> {

  private final String alias;

  public SysoutLogger(String alias) {
    this.alias = alias;
  }

  @Override
  public void accept(OutputFrame frame) {
    if (frame.getType() == OutputFrame.OutputType.END) {
      return;
    }
    String text = frame.getUtf8String();
    if (!text.isEmpty()) {
      System.out.print("[" + alias + ":" + frame.getType().name() + "] " + text);
    }
  }
}
